import config = require('config');
import { Duration, Tags } from 'aws-cdk-lib';
import {
    UserData,
    LaunchTemplate,
    InstanceType,
    MachineImage,
    AmazonLinuxCpuType,
    CfnKeyPair,
    KeyPair,
    KeyPairType,
} from 'aws-cdk-lib/aws-ec2';
import {
    ApplicationLoadBalancer,
    ApplicationTargetGroup,
    ApplicationProtocol,
    Protocol,
} from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AutoScalingGroup, BlockDeviceVolume, EbsDeviceVolumeType, HealthCheck } from 'aws-cdk-lib/aws-autoscaling';
import { BucketDeployment, Source } from 'aws-cdk-lib/aws-s3-deployment';
import { ComparisonOperator, TreatMissingData, Alarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class Ec2Stack {
    public alb: ApplicationLoadBalancer;
    public webTargetGroup: ApplicationTargetGroup;
    public webAutoScalingGroup: AutoScalingGroup;

    constructor(scope: MainStack) {
        new BucketDeployment(scope, 'UserDataBucketDeployment', {
            sources: [Source.asset('./userdata')],
            destinationBucket: scope.s3.userDataBucket,
        });

        const webUserData = UserData.forLinux();
        webUserData.addCommands(
            // Stop the SSM agent (addressing this issue: https://repost.aws/questions/QUgNz4VGCFSC2TYekM-6GiDQ/dnf-yum-both-fails-while-being-executed-on-instance-bootstrap-on-amazon-linux-2023)
            'systemctl stop amazon-ssm-agent',

            'mkdir /root/userdata',
            `aws s3 sync s3://${scope.s3.userDataBucket.bucketName}/ /root/userdata/ --region ${config.get(
                'aws.computing.region',
            )}`,

            'timedatectl set-timezone Asia/Tokyo',

            'localectl set-locale LANG=ja_JP.UTF-8',

            'dnf -y update',

            'dnf -y install amazon-cloudwatch-agent amazon-efs-utils nginx php php-fpm php-mysqlnd php-gd composer git mlocate',

            'cp -rp /root/userdata/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/amazon-cloudwatch-agent.json /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.d/',

            'mkdir -p /data',
            `echo "${scope.efs.fileSystem.ref}:/ /data efs tls,_netdev" >> /etc/fstab`,
            'mount -a -t efs,nfs4 defaults',

            'systemctl restart nginx',
            'systemctl restart php-fpm',
            'systemctl restart amazon-cloudwatch-agent',

            'systemctl enable nginx',
            'systemctl enable php-fpm',
            'systemctl enable amazon-cloudwatch-agent',

            'touch /var/log/nginx/access.log',
            'touch /var/log/nginx/error.log',
            'touch /var/log/php-fpm/error.log',
            'touch /var/log/php-fpm/www-error.log',

            'chown nginx:nginx -R /var/log/nginx',
            'chown nginx:nginx -R /var/log/php-fpm',

            'updatedb',

            // Start the SSM agent (addressing this issue: https://repost.aws/questions/QUgNz4VGCFSC2TYekM-6GiDQ/dnf-yum-both-fails-while-being-executed-on-instance-bootstrap-on-amazon-linux-2023)
            'systemctl start amazon-ssm-agent',

            'rm -rf /root/userdata',
        );

        const webKeyPair = new CfnKeyPair(scope, 'WebKeyPair', {
            keyName: StackUtil.getName('WebKeyPair'),
        });
        webKeyPair.applyRemovalPolicy(config.get('ec2.keyPair.removalPolicy'));

        this.webAutoScalingGroup = new AutoScalingGroup(scope, 'WebAsg', {
            vpc: scope.vpc.vpc,
            launchTemplate: new LaunchTemplate(scope, StackUtil.getName('WebLaunchTemplate'), {
                instanceType: InstanceType.of(
                    config.get('ec2.launchTemplate.web.instanceClass'),
                    config.get('ec2.launchTemplate.web.instanceSize'),
                ),
                launchTemplateName: StackUtil.getName('WebLaunchTemplate'),
                keyPair: KeyPair.fromKeyPairAttributes(scope, 'WebKeyPairFrom', {
                    keyPairName: webKeyPair.keyName,
                    type: KeyPairType.RSA,
                }),
                machineImage: MachineImage.latestAmazonLinux2023({
                    cpuType: AmazonLinuxCpuType.ARM_64,
                }),
                role: scope.iam.webRole,
                requireImdsv2: true,
                blockDevices: [
                    {
                        deviceName: '/dev/xvda',
                        volume: BlockDeviceVolume.ebs(config.get('ec2.launchTemplate.web.ebsVolumeSize'), {
                            volumeType: EbsDeviceVolumeType.GP3,
                            deleteOnTermination: true,
                            encrypted: true,
                        }),
                    },
                ],
                securityGroup: scope.vpc.webSecurityGroup,
                userData: webUserData,
            }),
            healthCheck: HealthCheck.ec2({
                grace: Duration.seconds(300),
            }),
            maxCapacity: config.get('ec2.launchTemplate.web.capacity.max'),
            minCapacity: config.get('ec2.launchTemplate.web.capacity.min'),
            vpcSubnets: {
                availabilityZones: scope.vpc.vpc.availabilityZones,
            },
        });
        Tags.of(this.webAutoScalingGroup).add(config.get('roleIdentificationTagKey'), StackUtil.getName('web'));

        this.alb = new ApplicationLoadBalancer(scope, 'Elb', {
            vpc: scope.vpc.vpc,
            http2Enabled: true,
            internetFacing: true,
            loadBalancerName: StackUtil.getName('elb'),
            securityGroup: scope.vpc.lbSecurityGroup,
        });

        const listenerHttp = this.alb.addListener('ElbListenerHttp', {
            port: 80,
        });

        this.webTargetGroup = listenerHttp.addTargets('ElbTargetHttp', {
            targetGroupName: StackUtil.getName('web'),
            protocol: ApplicationProtocol.HTTP,
            port: 80,
            deregistrationDelay: config.get('ec2.elb.web.deregistrationDelay'),
            targets: [this.webAutoScalingGroup],
            healthCheck: {
                protocol: Protocol.HTTP,
                path: config.get('ec2.elb.web.healthCheck.path'),
                healthyThresholdCount: config.get('ec2.elb.web.healthCheck.healthyThresholdCount'),
                unhealthyThresholdCount: config.get('ec2.elb.web.healthCheck.unhealthyThresholdCount'),
                timeout: config.get('ec2.elb.web.healthCheck.timeout'),
                interval: config.get('ec2.elb.web.healthCheck.interval'),
                healthyHttpCodes: config.get('ec2.elb.web.healthCheck.healthyHttpCodes'),
            },
        });

        this.webAutoScalingGroup.scaleOnRequestCount('WebScalingPolicy', {
            targetRequestsPerMinute: config.get('ec2.elb.web.scalingPolicy.targetRequestsPerMinute'),
            estimatedInstanceWarmup: config.get('ec2.elb.web.scalingPolicy.estimatedInstanceWarmup'),
        });

        if (config.get('ec2.cloudwatch.alarm.enable')) {
            const webTargetGroupAlarm = new Alarm(scope, 'WebTargetGroupAlarm', {
                alarmName: 'AlbAllInstancesStopped',
                alarmDescription: 'ALB All instances have stopped',
                threshold: 0,
                comparisonOperator: ComparisonOperator.LESS_THAN_OR_EQUAL_TO_THRESHOLD,
                metric: new Metric({
                    namespace: 'AWS/ApplicationELB',
                    metricName: 'HealthyHostCount',
                    dimensionsMap: {
                        LoadBalancer: this.alb.loadBalancerFullName,
                        TargetGroup: this.webTargetGroup.targetGroupFullName,
                    },
                    statistic: 'Maximum', // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic
                    period: Duration.minutes(5),
                }),
                datapointsToAlarm: 1,
                evaluationPeriods: 1,
                treatMissingData: TreatMissingData.MISSING,
            });

            webTargetGroupAlarm.addAlarmAction(new SnsAction(scope.sns.topic));
            webTargetGroupAlarm.addOkAction(new SnsAction(scope.sns.topic));

            const webAutoScalingGroupAlarm = new Alarm(scope, 'WebAutoScalingGroupAlarm', {
                alarmName: 'WebLongTermCpuLoadStatus',
                alarmDescription: 'Web Long-term CPU load status',
                threshold: 90,
                comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                metric: new Metric({
                    namespace: 'AWS/EC2',
                    metricName: 'CPUUtilization',
                    dimensionsMap: {
                        AutoScalingGroup: this.webAutoScalingGroup.autoScalingGroupName,
                    },
                    statistic: 'Maximum', // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic
                    period: Duration.minutes(5),
                }),
                datapointsToAlarm: 3,
                evaluationPeriods: 3,
                treatMissingData: TreatMissingData.MISSING,
            });

            webAutoScalingGroupAlarm.addAlarmAction(new SnsAction(scope.sns.topic));
            webAutoScalingGroupAlarm.addOkAction(new SnsAction(scope.sns.topic));
        }
    }
}
