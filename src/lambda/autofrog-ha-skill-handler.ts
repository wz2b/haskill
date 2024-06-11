import {SmartHomeRequest, AlexaResponse, ErrorPayload, PayloadType, ErrorType} from './smarthometypes'
import {handleDiscovery} from "./discovery";
import {handlePowerControl} from "./powercontroller";
import * as AWS from '@aws-sdk/client-secrets-manager';

// Initialize the Secrets Manager client
const secretsManager = new AWS.SecretsManager();


async function getAccessToken(): Promise<string> {
    const secretId = "/autofrog-ha-skill/secrets";  // ID or name of your secret in Secrets Manager

    try {
        const data = await secretsManager.getSecretValue({ SecretId: secretId });
        if (data.SecretString) {
            const secret = JSON.parse(data.SecretString);
            const token = secret["ha_token"];
            if (typeof token === 'string') {
                return token; // Successfully return the token
            } else {
                return Promise.reject(new Error("Token is not a string"));
            }
        } else {
            return Promise.reject(new Error("Secret string is empty or undefined"));
        }
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
        console.error(`Error retrieving secret: ${errorMessage}`);
        return Promise.reject(new Error(`Unable to retrieve access token: ${errorMessage}`));
    }
}


export async function handler(event: SmartHomeRequest): Promise<AlexaResponse<PayloadType>> {
    try {
        switch (event.directive.header.namespace) {
            case 'Alexa.Discovery':
                return handleDiscovery(event);
            case 'Alexa.PowerController':
                if (event.directive.endpoint) {
                    return handlePowerControl(event);
                } else {
                    // Properly handle the missing endpoint error
                    return generateErrorResponse(event, "ENDPOINT_UNREACHABLE", "Endpoint required but missing.");
                }
            default:
                // Handle unsupported namespace
                return generateErrorResponse(event, "INVALID_DIRECTIVE", "Unsupported namespace provided.");
        }
    } catch (error) {
        console.error(`Error handling directive: ${error}`);
        // Fallback error response
        return generateErrorResponse(event, "INTERNAL_ERROR", "An internal error occurred.");
    }
}

function generateErrorResponse(event: SmartHomeRequest, type: string, message: string): AlexaResponse<ErrorPayload> {
    return {
        event: {
            header: {
                namespace: 'Alexa',
                name: 'ErrorResponse',
                messageId: event.directive.header.messageId,
                payloadVersion: '3',
                correlationToken: event.directive.header.correlationToken ?? undefined
            },
            endpoint: event.directive.endpoint ? {
                endpointId: event.directive.endpoint.endpointId
            } : undefined,
            payload: {
                type: ErrorType.InternalError,
                message: message
            }
        }
    };
}
