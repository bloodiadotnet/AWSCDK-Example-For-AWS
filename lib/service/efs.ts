import config = require('config');
import { CfnFileSystem, CfnMountTarget } from 'aws-cdk-lib/aws-efs';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class EfsStack {
    public fileSystem: CfnFileSystem;

    constructor(scope: MainStack) {
        this.fileSystem = new CfnFileSystem(scope, 'Efs', {
            fileSystemTags: [
                {
                    key: 'Name',
                    value: StackUtil.getName('efs'),
                },
            ],
            lifecyclePolicies: [
                {
                    transitionToIa: config.get('efs.lifecyclePolicy'),
                },
            ],
            throughputMode: config.get('efs.throughputMode'),
            encrypted: true,
        });
        this.fileSystem.applyRemovalPolicy(config.get('efs.removalPolicy'));

        scope.vpc.vpc.publicSubnets.forEach((subnet) => {
            new CfnMountTarget(scope, `MountTarget${subnet.availabilityZone}`, {
                fileSystemId: this.fileSystem.ref,
                securityGroups: [scope.vpc.fsSecurityGroup.securityGroupId],
                subnetId: subnet.subnetId,
            });
        });
    }
}
