import config = require('config');
import { Aspects, Tag } from 'aws-cdk-lib';
import { IpAddresses, SubnetType, Vpc, IVpc, SecurityGroup, ISecurityGroup, Peer, Port } from 'aws-cdk-lib/aws-ec2';

import { StackUtil } from '../../util/stack-util';
import { MainStack } from '../main-stack';

export class VpcStack {
    public vpc: IVpc;
    public lbSecurityGroup: ISecurityGroup;
    public webSecurityGroup: ISecurityGroup;
    public dbSecurityGroup: ISecurityGroup;
    public fsSecurityGroup: ISecurityGroup;

    constructor(scope: MainStack) {
        var allowedSources: {
            cidrIp: string;
            description: string;
        }[] = config.get('vpc.allowedSources');

        // VPCを作成
        this.vpc = new Vpc(scope, 'Vpc', {
            ipAddresses: IpAddresses.cidr(config.get('vpc.ipAddresses')),
            vpcName: StackUtil.getName('vpc'),
            availabilityZones: ['ap-northeast-1a', 'ap-northeast-1c'],
            subnetConfiguration: [
                {
                    name: 'public',
                    subnetType: SubnetType.PUBLIC,
                    cidrMask: 24,
                    mapPublicIpOnLaunch: true,
                },
            ],
        });
        // タグを追加
        Aspects.of(this.vpc).add(new Tag('Name', StackUtil.getName('vpc')));

        // ELB向けセキュリティグループを作成
        this.lbSecurityGroup = new SecurityGroup(scope, 'ElbSg', {
            vpc: this.vpc,
            description: `Load Balancer Group for ${StackUtil.getName()}`,
            securityGroupName: StackUtil.getName('elb'),
            allowAllOutbound: false,
        });
        // タグを追加
        Aspects.of(this.lbSecurityGroup).add(new Tag('Name', StackUtil.getName('elb')));
        // インバウンドルールを追加
        this.lbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(80), 'Browser access from outside');
        this.lbSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(80), 'Browser access from outside');
        this.lbSecurityGroup.addIngressRule(Peer.anyIpv4(), Port.tcp(443), 'Browser access from outside');
        this.lbSecurityGroup.addIngressRule(Peer.anyIpv6(), Port.tcp(443), 'Browser access from outside');

        // Web向けセキュリティグループを作成
        this.webSecurityGroup = new SecurityGroup(scope, 'WebSg', {
            vpc: this.vpc,
            description: `Web Group for ${StackUtil.getName()}`,
            securityGroupName: StackUtil.getName('web'),
        });
        // タグを追加
        Aspects.of(this.webSecurityGroup).add(new Tag('Name', StackUtil.getName('web')));
        // インバウンドルールを追加
        allowedSources.forEach((allowedSource) => {
            this.webSecurityGroup.addIngressRule(
                Peer.ipv4(allowedSource.cidrIp),
                Port.tcp(80),
                allowedSource.description,
            );
        });

        // DB向けセキュリティグループを作成
        this.dbSecurityGroup = new SecurityGroup(scope, 'DbSg', {
            vpc: this.vpc,
            description: `Database Group for ${StackUtil.getName()}`,
            securityGroupName: StackUtil.getName('rds'),
            allowAllOutbound: false, // RDS側からのアクセスはしない
        });
        // タグを追加
        Aspects.of(this.dbSecurityGroup).add(new Tag('Name', StackUtil.getName('rds')));
        // インバウンドルールを追加
        this.dbSecurityGroup.addIngressRule(
            this.webSecurityGroup,
            Port.tcp(3306),
            `MySQL access from ${StackUtil.getName('web')}`,
        );
        allowedSources.forEach((allowedSource) => {
            this.dbSecurityGroup.addIngressRule(
                Peer.ipv4(allowedSource.cidrIp),
                Port.tcp(3306),
                allowedSource.description,
            );
        });

        // EFS向けセキュリティグループを作成
        this.fsSecurityGroup = new SecurityGroup(scope, 'EfsSg', {
            vpc: this.vpc,
            description: `Storage Group for ${StackUtil.getName()}`,
            securityGroupName: StackUtil.getName('efs'),
            allowAllOutbound: false, // EFS側からのアクセスはしない
        });
        // タグを追加
        Aspects.of(this.fsSecurityGroup).add(new Tag('Name', StackUtil.getName('efs')));
        // インバウンドルールを追加
        this.fsSecurityGroup.addIngressRule(
            this.webSecurityGroup,
            Port.tcp(2049),
            `NFS access from ${StackUtil.getName('web')}`,
        );
    }
}
