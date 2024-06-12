/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */

import * as cdk from 'aws-cdk-lib';
import * as ask from 'aws-cdk-lib/alexa-ask';
import * as iam from 'aws-cdk-lib/aws-iam';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as assets from 'aws-cdk-lib/aws-s3-assets';
import {Construct} from 'constructs';

const ALEXA_SERVICE_PRINCIPAL = 'alexa-appkit.amazon.com';
const BACKEND_LAMBDA_PERMISSION_ACTION = 'lambda:InvokeFunction';

/**
 * An Alexa Skill, either managed by this CDK app, or imported.
 */
export interface ISkill extends cdk.IResource {
    /**
     * The ID associated with this Skill.
     *
     * @attribute
     */
    readonly skillId: string;
};

abstract class SkillBase extends cdk.Resource implements ISkill {
    public abstract readonly skillId: string;
};

/**
 * Construction properties for an Alexa Skill object
 */
export interface SkillProps {
    /**
     * The Lambda Function to be configured as the endpoint for the Alexa Skill.
     *
     * @default - No endpoint Lambda Function
     */
    readonly endpointLambdaFunction?: lambda.IFunction;

    /**
     * The relative path to the skill package directory containing all configuration files for the Alexa Skill.
     */
    readonly skillPackagePath: string;

    /**
     * Vendor ID associated with Alexa Developer account.
     */
    readonly alexaVendorId: string;

    /**
     * Client ID of Login with Amazon (LWA) Security Profile.
     */
    readonly lwaClientId: string;

    /**
     * Client secret associated with Login with Amazon (LWA) Client ID.
     */
    readonly lwaClientSecret: cdk.SecretValue;

    /**
     * Refresh token associated with Login with Amazon (LWA) Security Profile.
     */
    readonly lwaRefreshToken: cdk.SecretValue;
};

/**
 * Defines an Alexa Skill.
 *
 * @resource Alexa::ASK::Skill
 */
export class HaSkill extends SkillBase {
    /**
     * Reference an existing Skill,
     * defined outside of the CDK code, by Skill ID.
     */
    public static fromSkillId(scope: Construct, id: string, skillId: string): ISkill {
        class Imported extends SkillBase {
            public readonly skillId = skillId;
        }
        return new Imported(scope, id);
    }

    /**
     * The Skill ID of this Alexa Skill
     */
    public readonly skillId: string;

    constructor(scope: Construct, id: string, props: SkillProps) {
        // Validate that SSM SecureString was not supplied--Alexa::ASK::Skill does not support SSM SecureString references.
        const resolvedClientSecret = cdk.Tokenization.resolve(props.lwaClientSecret, {
            scope,
            resolver: new cdk.DefaultTokenResolver(new cdk.StringConcat()),
        });
        const resolvedRefreshToken = cdk.Tokenization.resolve(props.lwaRefreshToken, {
            scope,
            resolver: new cdk.DefaultTokenResolver(new cdk.StringConcat()),
        });
        if (resolvedClientSecret.includes('ssm-secure')) {
            throw new Error('Invalid prop: lwaClientSecret; SSM SecureString is not supported. Use Secrets Manager secret instead.');
        }
        if (resolvedRefreshToken.includes('ssm-secure')) {
            throw new Error('Invalid prop: lwaRefreshToken; SSM SecureString is not supported. Use Secrets Manager secret instead.');
        }

        super(scope, id);


        // Role giving CfnSkill resource read-only access to skill package asset in S3.
        const askResourceRole = new iam.Role(this, 'AskResourceRole', {
            assumedBy: new iam.ServicePrincipal(ALEXA_SERVICE_PRINCIPAL),
        });

        //
        // Skill package S3 asset.
        // An asset represents a local file or directory, which is automatically uploaded to S3 and then can be referenced within a CDK application.
        //
        const skillPackageAsset = new assets.Asset(this, 'SkillPackageAsset', {
            path: props.skillPackagePath,
            readers: [askResourceRole],
        });


        // Alexa Skill with override that injects the endpoint Lambda Function in the skill manifest.
        const skill: ask.CfnSkill = new ask.CfnSkill(this, 'Resource', {
            vendorId: props.alexaVendorId,
            skillPackage: {
                s3Bucket: skillPackageAsset.s3BucketName,
                s3Key: skillPackageAsset.s3ObjectKey,
                s3BucketRole: askResourceRole.roleArn,
                ...props.endpointLambdaFunction && { // Only add overrides property if endpointLambdaFunction prop was supplied.
                    overrides: {
                        manifest: {
                            apis: {
                                smartHome: {
                                    endpoint: {
                                        uri: props.endpointLambdaFunction?.functionArn,
                                    },
                                },
                            },
                        },
                    },
                },
            },
            authenticationConfiguration: {
                clientId: props.lwaClientId,
                clientSecret: props.lwaClientSecret.toString(),
                refreshToken: props.lwaRefreshToken.toString(),
            },
        });


        this.skillId = skill.ref;

    }

};
