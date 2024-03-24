#!/usr/bin/env node

import config = require('config');
import 'source-map-support/register';
import { App, Environment } from 'aws-cdk-lib';

import { StackUtil } from '../util/stack-util';
import { MainStack } from '../lib/main-stack';

const defaultEnvironment: Environment = {
    account: config.get('aws.computing.account'),
    region: config.get('aws.computing.region'),
};

if (process.env['NODE_ENV'] == null || process.env['NODE_ENV'] === '') {
    throw new Error('NODE_ENV is not set');
}
if (process.env['AWS_PROFILE'] == null || process.env['AWS_PROFILE'] === '') {
    throw new Error('AWS_PROFILE is not set');
}

const app = new App();

Promise.resolve()
    .then(async () => {
        new MainStack(app, StackUtil.getName(), { env: defaultEnvironment });
    })
    .catch((err) =>
        console.error({
            message: err.message,
            stack: err.stack,
        }),
    );
