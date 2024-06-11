import {AlexaResponse, PowerControllerPayload, SmartHomeRequest} from "./smarthometypes";

export async function handlePowerControl(event: SmartHomeRequest): Promise<AlexaResponse<PowerControllerPayload>> {
    return Promise.resolve({
        event: {
            header: {
                namespace: 'Alexa',
                name: 'ErrorResponse',
                messageId: event.directive.header.messageId,
                payloadVersion: '3',
                correlationToken: event.directive.header.correlationToken
            },
            endpoint: event.directive.endpoint,
            payload: {}
        }
    })
}
