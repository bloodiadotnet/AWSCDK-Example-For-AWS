import config = require('config');
import { Topic, ITopic } from 'aws-cdk-lib/aws-sns';
import { EmailSubscription } from 'aws-cdk-lib/aws-sns-subscriptions';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class SnsStack {
    public topic: ITopic;

    constructor(scope: MainStack) {
        if (config.get('sns.subscription.enable')) {
            const subscription: string[] = config.get('sns.subscription.settings.group');

            this.topic = new Topic(scope, 'Topic', {
                displayName: StackUtil.getName('topic'),
                topicName: StackUtil.getName('topic'),
            });
            subscription.forEach((subscription) => {
                this.topic.addSubscription(new EmailSubscription(subscription));
            });
        }
    }
}
