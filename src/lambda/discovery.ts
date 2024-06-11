import { AlexaResponse, DiscoveryPayload, HomeAssistantEntity, SmartHomeRequest } from "./smarthometypes";
import { DynamoDBClient } from "@aws-sdk/client-dynamodb";
import { DynamoDBDocumentClient, ScanCommand } from "@aws-sdk/lib-dynamodb";

// Initialize the DynamoDB Client
const ddbClient = new DynamoDBClient({});
const ddbDocClient = DynamoDBDocumentClient.from(ddbClient);

export async function handleDiscovery(event: SmartHomeRequest): Promise<AlexaResponse<DiscoveryPayload>> {
    try {
        const scanResult = await ddbDocClient.send(new ScanCommand({
            TableName: "home-assistant-entities"
        }));

        const endpoints = scanResult.Items?.map((item: any) => ({
            endpointId: item.entity_id,
            manufacturerName: item.manufacturerName,
            friendlyName: item.friendlyName,
            description: item.description,
            displayCategories: item.displayCategories,
            cookie: {}, // Optionally use this to store useful info that you might need in subsequent requests
            capabilities: item.capabilities // Ensure this matches Alexa's expected format
        })) ?? [];

        return {
            event: {
                header: {
                    namespace: 'Alexa.Discovery',
                    name: 'Discover.Response',
                    messageId: event.directive.header.messageId,
                    payloadVersion: '3',
                    correlationToken: event.directive.header.correlationToken
                },
                payload: {
                    endpoints: endpoints
                }
            }
        };
    } catch (error) {
        console.error(`Error in handleDiscovery: ${error}`);
        throw new Error("Failed to handle discovery request");
    }
}
