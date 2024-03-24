import config = require('config');
import { Duration } from 'aws-cdk-lib';
import { InstanceType, SubnetType } from 'aws-cdk-lib/aws-ec2';
import {
    ParameterGroup,
    DatabaseCluster,
    DatabaseClusterEngine,
    ClusterInstance,
    CaCertificate,
    Credentials,
} from 'aws-cdk-lib/aws-rds';
import { ComparisonOperator, TreatMissingData, Alarm, Metric } from 'aws-cdk-lib/aws-cloudwatch';
import { SnsAction } from 'aws-cdk-lib/aws-cloudwatch-actions';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class RdsStack {
    public cluster: DatabaseCluster;

    constructor(scope: MainStack) {
        const rdsCredentials = Credentials.fromUsername(config.get('rds.mysql.username'));

        const clusterParameterGroup = new ParameterGroup(scope, 'ClusterParameterGroup', {
            engine: DatabaseClusterEngine.auroraMysql({
                version: config.get('rds.engineVersion'),
            }),
            parameters: config.get('rds.mysql.parameters.cluster'),
            description: `Parameter group for ${StackUtil.getName('rds')}`,
        });

        const instanceParameterGroup = new ParameterGroup(scope, 'InstanceParameterGroup', {
            engine: DatabaseClusterEngine.auroraMysql({
                version: config.get('rds.engineVersion'),
            }),
            parameters: config.get('rds.mysql.parameters.instance'),
            description: `Parameter group for ${StackUtil.getName('instance-xxx')}`,
        });

        this.cluster = new DatabaseCluster(scope, StackUtil.getName('rds'), {
            clusterIdentifier: StackUtil.getName('rds'),
            engine: DatabaseClusterEngine.auroraMysql({
                version: config.get('rds.engineVersion'),
            }),
            vpc: scope.vpc.vpc,
            securityGroups: [scope.vpc.dbSecurityGroup],
            vpcSubnets: {
                subnetType: SubnetType.PUBLIC,
            },

            writer: ClusterInstance.provisioned('writer', {
                instanceIdentifier: StackUtil.getName('instance-001'),
                instanceType: InstanceType.of(config.get('rds.instanceClass'), config.get('rds.instanceSize')),
                parameterGroup: instanceParameterGroup,
                autoMinorVersionUpgrade: false,
                caCertificate: CaCertificate.RDS_CA_RDS2048_G1,
                enablePerformanceInsights: config.get('rds.enablePerformanceInsights'),
            }),

            readers: [
                ClusterInstance.provisioned('reader', {
                    instanceIdentifier: StackUtil.getName('instance-002'),
                    instanceType: InstanceType.of(config.get('rds.instanceClass'), config.get('rds.instanceSize')),
                    parameterGroup: instanceParameterGroup,
                    autoMinorVersionUpgrade: false,
                    caCertificate: CaCertificate.RDS_CA_RDS2048_G1,
                    enablePerformanceInsights: config.get('rds.enablePerformanceInsights'),
                }),
            ],
            credentials: rdsCredentials,
            backup: {
                retention: Duration.days(config.get('rds.backupGeneration')),
                preferredWindow: config.get('rds.backupWindow'),
            },
            storageEncrypted: true,
            defaultDatabaseName: config.get('rds.mysql.databaseName'),
            instanceIdentifierBase: StackUtil.getName('rds'),
            monitoringInterval: Duration.seconds(60),
            parameterGroup: clusterParameterGroup,
            preferredMaintenanceWindow: config.get('rds.maintenanceWindow'),
            removalPolicy: config.get('rds.removalPolicy'),
            copyTagsToSnapshot: config.get('rds.copyTagsToSnapshot'),
        });

        if (config.get('rds.cloudwatch.alarm.enable')) {
            const writerAlarm = new Alarm(scope, 'Alarm', {
                alarmName: 'RdsHighCpuSustained',
                alarmDescription: 'RDS High CPU sustained',
                threshold: 90,
                comparisonOperator: ComparisonOperator.GREATER_THAN_OR_EQUAL_TO_THRESHOLD,
                metric: new Metric({
                    namespace: 'AWS/RDS',
                    metricName: 'CPUUtilization',
                    dimensionsMap: {
                        DBClusterIdentifier: this.cluster.clusterIdentifier,
                        Role: 'WRITER',
                    },
                    statistic: 'Average', // https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/cloudwatch_concepts.html#Statistic
                    period: Duration.minutes(5),
                }),
                datapointsToAlarm: 3,
                evaluationPeriods: 3,
                treatMissingData: TreatMissingData.MISSING,
            });

            writerAlarm.addAlarmAction(new SnsAction(scope.sns.topic));
            writerAlarm.addOkAction(new SnsAction(scope.sns.topic));
        }
    }
}
