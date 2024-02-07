import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
import {Skill} from "cdk-alexa-skill";
import * as nodejs from "aws-cdk-lib/aws-lambda-nodejs"

// import * as sqs from 'aws-cdk-lib/aws-sqs';

export class HomeStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    // The code that defines your stack goes here

    // example resource
    // const queue = new sqs.Queue(this, 'HomeQueue', {
    //   visibilityTimeout: cdk.Duration.seconds(300)
    // });

    const skillBackendLambdaFunction = new nodejs.NodejsFunction(this, 'skill-handler', {
      bundling: {
        network: 'host',
        securityOpt: 'no-new-privileges',
        user: 'user:group',
        volumesFrom: ['777f7dc92da7'],
        volumes: [{ hostPath: '/host-path', containerPath: '/container-path' }],
      },
    });


    const skill = new Skill(this, 'Skill', {
      endpointLambdaFunction: skillBackendLambdaFunction, // @aws-cdk/aws-lambda.IFunction object containing backend code for the Alexa Skill
      skillPackagePath: 'src/skill-package', // path to your skill package
      alexaVendorId: 'XXXXXXXXXX', // vendor ID of Alexa Developer account
      lwaClientId: 'XXXXXXXXXX', // client ID of LWA Security Profile
      lwaClientSecret: cdk.SecretValue.secretsManager('lwa-client-secret'), // @aws-cdk/core.SecretValue object containing client secret of LWA Security Profile
      lwaRefreshToken: cdk.SecretValue.secretsManager('lwa-refresh-token') // @aws-cdk/core.SecretValue object containing refresh token of LWA Security Profile
    });

  }
}
