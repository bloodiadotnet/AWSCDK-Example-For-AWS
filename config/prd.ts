import { Duration, RemovalPolicy } from 'aws-cdk-lib';
import { InstanceClass, InstanceSize } from 'aws-cdk-lib/aws-ec2';
import { SslPolicy } from 'aws-cdk-lib/aws-elasticloadbalancingv2';
import { AuroraMysqlEngineVersion } from 'aws-cdk-lib/aws-rds';

export = {
    s3: {
        removalPolicy: RemovalPolicy.DESTROY,
        autoDeleteObjects: true,
    },

    efs: {
        lifecyclePolicy: 'AFTER_7_DAYS',
        throughputMode: 'bursting',
        removalPolicy: RemovalPolicy.DESTROY,
    },

    ec2: {
        launchTemplate: {
            web: {
                instanceClass: InstanceClass.BURSTABLE4_GRAVITON,
                instanceSize: InstanceSize.MICRO,
                capacity: {
                    max: 4,
                    min: 2,
                },
                ebsVolumeSize: 20, // GB
            },
        },

        keyPair: {
            removalPolicy: RemovalPolicy.DESTROY,
        },

        elb: {
            web: {
                deregistrationDelay: Duration.seconds(300),
                healthCheck: {
                    path: '/',
                    healthyThresholdCount: 2,
                    unhealthyThresholdCount: 4,
                    timeout: Duration.seconds(10),
                    interval: Duration.seconds(30),
                    healthyHttpCodes: '200',
                },
                scalingPolicy: {
                    targetRequestsPerMinute: 200,
                    estimatedInstanceWarmup: Duration.seconds(300),
                },
                sslPolicy: SslPolicy.TLS13_RES,
            },
        },
    },
    roleIdentificationTagKey: 'Role',

    rds: {
        engineVersion: AuroraMysqlEngineVersion.VER_3_05_2,
        instanceClass: InstanceClass.BURSTABLE4_GRAVITON,
        instanceSize: InstanceSize.MEDIUM,
        capacity: 1,
        backupGeneration: 7,
        backupWindow: '17:30-18:00', // UTC
        maintenanceWindow: 'Mon:18:00-Mon:19:00', // UTC
        copyTagsToSnapshot: true,
        enablePerformanceInsights: true,
        removalPolicy: RemovalPolicy.DESTROY,
        mysql: {
            username: 'dba',
            databaseName: 'mydb',
            parameters: {
                cluster: {
                    long_query_time: '10',
                    slow_query_log: '1',
                    time_zone: 'Asia/Tokyo',
                },
                instance: {
                    long_query_time: '10',
                    slow_query_log: '1',
                },
            },
        },
    },

    ssm: {
        associations: {
            enable: true,
            settings: {
                patchAssociation: {
                    scheduleExpression: 'rate(1 day)',
                },
                updateSSMAgentAssociation: {
                    scheduleExpression: 'rate(1 day)',
                },
                gatherSoftwareInventoryAssociation: {
                    scheduleExpression: 'rate(1 day)',
                },
            },
        },
    },

    sns: {
        subscription: {
            enable: true,
            settings: {
                group: ['user1@example', 'user2@example', 'user3@example', 'user4@example', 'user5@example'],
            },
        },
    },

    cloudwatch: {
        alarm: {
            enable: true,
        },
    },
};
