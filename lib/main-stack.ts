import config = require('config');
import { App, Stack, StackProps, Tags } from 'aws-cdk-lib';

import { IamStack } from './service/iam';
import { SnsStack } from './service/sns';
import { VpcStack } from './service/vpc';
import { S3Stack } from './service/s3';
import { EfsStack } from './service/efs';
import { Ec2Stack } from './service/ec2';
import { SsmStack } from './service/ssm';
import { RdsStack } from './service/rds';

export class MainStack extends Stack {
    public iam: IamStack;
    public sns: SnsStack;
    public vpc: VpcStack;
    public s3: S3Stack;
    public efs: EfsStack;
    public ec2: Ec2Stack;
    public ssm: SsmStack;
    public rds: RdsStack;

    constructor(app: App, id: string, props?: StackProps) {
        super(app, id, props);

        Promise.resolve()
            .then(async () => {
                this.iam = new IamStack(this);
                this.sns = new SnsStack(this);
                this.vpc = new VpcStack(this);
                this.s3 = new S3Stack(this);
                this.efs = new EfsStack(this);
                this.ec2 = new Ec2Stack(this);
                this.ssm = new SsmStack(this);
                this.rds = new RdsStack(this);

                Tags.of(this).add(config.get('tags.stage.key'), config.get('tags.stage.value'));
                Tags.of(this).add(config.get('tags.product.key'), config.get('tags.product.value'));
            })
            .catch((err) =>
                console.error({
                    message: err.message,
                    stack: err.stack,
                }),
            );
    }
}
