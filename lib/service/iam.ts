import { Role, IRole, ServicePrincipal, ManagedPolicy } from 'aws-cdk-lib/aws-iam';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class IamStack {
    public webRole: IRole;

    constructor(scope: MainStack) {
        this.webRole = new Role(scope, 'WebRole', {
            assumedBy: new ServicePrincipal('ec2.amazonaws.com'),
            managedPolicies: [
                ManagedPolicy.fromAwsManagedPolicyName('AmazonEC2FullAccess'),
                ManagedPolicy.fromAwsManagedPolicyName('AmazonS3FullAccess'),
                ManagedPolicy.fromAwsManagedPolicyName('AmazonSSMFullAccess'),
                ManagedPolicy.fromAwsManagedPolicyName('CloudWatchAgentServerPolicy'),
            ],
            roleName: StackUtil.getName('web'),
        });
    }
}
