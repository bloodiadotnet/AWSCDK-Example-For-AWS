import config = require('config');
import { CfnAssociation } from 'aws-cdk-lib/aws-ssm';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class SsmStack {
    constructor(scope: MainStack) {
        if (config.get('ssm.associations.enable')) {
            new CfnAssociation(scope, 'PatchAssociation', {
                name: 'AWS-RunPatchBaseline',
                applyOnlyAtCronInterval: false,
                associationName: StackUtil.getName('PatchAssociation'),
                complianceSeverity: 'HIGH',
                maxConcurrency: '1000',
                maxErrors: '1000',
                parameters: {
                    Operation: ['Scan'],
                    RebootOption: ['NoReboot'],
                },
                scheduleExpression: config.get('ssm.associations.settings.patchAssociation.scheduleExpression'),
                syncCompliance: 'AUTO',
                targets: [
                    {
                        key: `tag:${config.get('roleIdentificationTagKey')}`,
                        values: [scope.iam.webRole.roleName],
                    },
                ],
                waitForSuccessTimeoutSeconds: 300,
            });

            new CfnAssociation(scope, 'UpdateSSMAgentAssociation', {
                name: 'AWS-UpdateSSMAgent',
                applyOnlyAtCronInterval: false,
                associationName: StackUtil.getName('UpdateSSMAgentAssociation'),
                maxConcurrency: '50',
                maxErrors: '10%',
                parameters: {
                    allowDowngrade: ['false'],
                },
                scheduleExpression: config.get(
                    'ssm.associations.settings.updateSSMAgentAssociation.scheduleExpression',
                ),
                syncCompliance: 'AUTO',
                targets: [
                    {
                        key: `tag:${config.get('roleIdentificationTagKey')}`,
                        values: [scope.iam.webRole.roleName],
                    },
                ],
                waitForSuccessTimeoutSeconds: 300,
            });

            new CfnAssociation(scope, 'GatherSoftwareInventoryAssociation', {
                name: 'AWS-GatherSoftwareInventory',
                applyOnlyAtCronInterval: false,
                associationName: StackUtil.getName('GatherSoftwareInventoryAssociation'),
                complianceSeverity: 'UNSPECIFIED',
                parameters: {
                    applications: ['Enabled'],
                    awsComponents: ['Enabled'],
                    customInventory: ['Enabled'],
                    instanceDetailedInformation: ['Enabled'],
                    networkConfig: ['Enabled'],
                    services: ['Enabled'],
                    windowsRoles: ['Enabled'],
                    windowsUpdates: ['Enabled'],
                },
                scheduleExpression: config.get(
                    'ssm.associations.settings.gatherSoftwareInventoryAssociation.scheduleExpression',
                ),
                syncCompliance: 'AUTO',
                targets: [
                    {
                        key: `tag:${config.get('roleIdentificationTagKey')}`,
                        values: [scope.iam.webRole.roleName],
                    },
                ],
                waitForSuccessTimeoutSeconds: 300,
            });
        }
    }
}
