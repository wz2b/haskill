export interface DirectiveHeader {
    namespace: string;
    name: string;
    messageId: string;
    correlationToken?: string;
    payloadVersion: string;
}

export interface DiscoveryEndpoint extends RequestEndpoint {
    manufacturerName: string;
    friendlyName: string;
    description: string;
    displayCategories: string[];
    cookie: Record<string, any>;
    capabilities: Capability[];
}

export interface RequestEndpoint {
    endpointId: string;
}

export interface Directive {
    header: DirectiveHeader;
    payload: any;  // Payload can be further detailed based on specific directives
    endpoint?: RequestEndpoint;  // This should be included for directives that target a specific device
}

export interface SmartHomeRequest {
    directive: Directive;
}

export interface AlexaResponse<T extends PayloadType> {
    event: {
        header: {
            namespace: string;
            name: string;
            messageId: string;
            payloadVersion: string;
            correlationToken?: string;
        };
        endpoint?: {
            endpointId: string;
        };
        payload: T;
    };
}


export enum ErrorType {
    EndpointUnreachable = "ENDPOINT_UNREACHABLE",
    InternalError = "INTERNAL_ERROR",
    InvalidDirective = "INVALID_DIRECTIVE",
    // Add other standard error types as needed
}

interface Capability {
    type: 'AlexaInterface';
    interface: string;
    version: string;
    properties?: {
        supported: Array<{ name: string }>;
        proactivelyReported: boolean;
        retrievable: boolean;
    };
}


export interface PayloadType {

}

export interface DiscoveryPayload extends PayloadType {
    endpoints: DiscoveryEndpoint[];
}

export interface PowerControllerPayload extends PayloadType {
    state?: string
}

export interface ErrorPayload  extends PayloadType{
    type: ErrorType;
    message: string;
}


/**
 * How entities are stored in DynamoDB
 */
export interface HomeAssistantEntity {
    entity_id: string;
    capabilities: any[]; // Adjust based on your actual capability structure
    description: string;
    displayCategories: string[];
    friendlyName: string;
    manufacturerName: string;
}

