import config = require('config');
import { Duration } from 'aws-cdk-lib';
import { Bucket, IBucket, BucketEncryption, BlockPublicAccess } from 'aws-cdk-lib/aws-s3';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class S3Stack {
    public userDataBucket: IBucket;
    public logBucket: IBucket;

    constructor(scope: MainStack) {
        this.userDataBucket = new Bucket(scope, 'UserDataBucket', {
            bucketName: StackUtil.getName('userdata'),
            encryption: BucketEncryption.S3_MANAGED,
            blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
            enforceSSL: true,
            removalPolicy: config.get('s3.removalPolicy'),
            autoDeleteObjects: config.get('s3.autoDeleteObjects'),
            lifecycleRules: [
                {
                    id: 'incomplete-multipart-upload',
                    abortIncompleteMultipartUploadAfter: Duration.days(1),
                    enabled: true,
                },
            ],
        });
    }
}
