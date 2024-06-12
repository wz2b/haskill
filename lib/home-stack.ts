import * as cdk from 'aws-cdk-lib';
import {Construct} from 'constructs';
import {Skill} from "cdk-alexa-skill";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs"
import {SourceMapMode} from "aws-cdk-lib/aws-lambda-nodejs" // Import the SSM module
import * as ssm from 'aws-cdk-lib/aws-ssm';
import * as lambda from "aws-cdk-lib/aws-lambda";
import * as iam from 'aws-cdk-lib/aws-iam';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import {Secret} from "aws-cdk-lib/aws-secretsmanager";
import {SecretValue} from "aws-cdk-lib";
import {HaSkill} from "./haskill";
import {Permission} from "aws-cdk-lib/aws-lambda";

// import * as sqs from 'aws-cdk-lib/aws-sqs';


export class HomeStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps) {
        super(scope, id, props);

        // The code that defines your stack goes here

        // example resource
        // const queue = new sqs.Queue(this, 'HomeQueue', {
        //   visibilityTimeout: cdk.Duration.seconds(300)
        // });

        const skillBackendLambdaFunction = new nodejs.NodejsFunction(this,
            'autofrog-ha-skill-handler', {
                entry: 'src/lambda/autofrog-ha-skill-handler.ts',
                handler: 'handler',
                runtime: lambda.Runtime.NODEJS_20_X,
                architecture: lambda.Architecture.ARM_64,
                memorySize: 128,
                timeout: cdk.Duration.seconds(5),
                reservedConcurrentExecutions: undefined /* impacts cost */,
                bundling: {
                    sourceMapMode: SourceMapMode.INLINE,
                    minify: true
                },
            });

        const PARAM_PREFIX = '/autofrog-ha-skill';
        const alexaVendorId = ssm.StringParameter.valueForStringParameter(this, `${PARAM_PREFIX}/alexa-developer-vendor-id`);
        const lwaClientId = ssm.StringParameter.valueForStringParameter(this, `${PARAM_PREFIX}/lwa-client-id`);

        const secret = Secret.fromSecretNameV2(this, 'secrets', `${PARAM_PREFIX}/secrets`);

        const lwaClientSecret = SecretValue.secretsManager(secret.secretArn, {
            jsonField: 'lwa_client_secret'
        });
        const lwaRefreshToken = SecretValue.secretsManager(secret.secretArn, {
            jsonField: 'lwa_refresh_token'
        });


        const table = dynamodb.Table.fromTableName(this, 'HomeAssistantEntities', 'home-assistant-entities');


        skillBackendLambdaFunction.addToRolePolicy(new iam.PolicyStatement({
                    actions: ['secretsmanager:GetSecretValue'],
                    resources: [secret.secretArn]
                }
            )
        );

        skillBackendLambdaFunction.addToRolePolicy(new iam.PolicyStatement({
            actions: [
                'dynamodb:GetItem',
                'dynamodb:Query',
                'dynamodb:Scan'
            ],
            resources: [table.tableArn]  // Use the correct reference depending on how you defined or imported the table
        }));

        skillBackendLambdaFunction.addPermission('OpenAlexaInvokePermission', {
            principal: new iam.ServicePrincipal('alexa-appkit.amazon.com'),
            action: 'lambda:InvokeFunction',
        });


        // const skill = new HaSkill(this, 'HaSkill', {
        //     endpointLambdaFunction: skillBackendLambdaFunction, // @aws-cdk/aws-lambda.IFunction object containing backend code for the Alexa Skill
        //     skillPackagePath: 'src/skill-package', // path to your skill package
        //     alexaVendorId: alexaVendorId, // vendor ID of Alexa Developer account
        //     lwaClientId: lwaClientId, // client ID of LWA Security Profile
        //     lwaClientSecret: lwaClientSecret, // @aws-cdk/core.SecretValue object containing client secret of LWA Security Profile
        //     lwaRefreshToken: lwaRefreshToken // @aws-cdk/core.SecretValue object containing refresh token of LWA Security Profile
        // });

        //
        // const permission: Permission = {
        //     principal: new iam.ServicePrincipal('alexa-appkit.amazon.com'),
        //     action: 'lambda:InvokeFunction',
        //     sourceArn: `arn:aws:lambda:us-east-1:384426254369:function:autofrog-ha-skill-autofroghaskillhandler3B318211-gYv1saT9JdD4`, // Use the actual ARN
        //     eventSourceToken: skill.skillId
        // }
        // skillBackendLambdaFunction.addPermission('AlexaInvokePermission', permission);

    }
}
