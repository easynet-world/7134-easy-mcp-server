import {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
	IDataObject,
} from 'n8n-workflow';

export class {{NODE_CLASS_NAME}} implements INodeType {
	description: INodeTypeDescription = {
		displayName: '{{DISPLAY_NAME}}',
		name: '{{NODE_NAME}}',
		icon: '{{ICON}}',
		group: ['transform'],
		version: 1,
		subtitle: '={{$parameter["operation"] + ": " + $parameter["resource"]}}',
		description: '{{DESCRIPTION}}',
		defaults: {
			name: '{{DISPLAY_NAME}}',
		},
		inputs: ['main'],
		outputs: ['main'],
		credentials: {{CREDENTIALS}},
		requestDefaults: {
			baseURL: '{{BASE_URL}}',
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: {{PROPERTIES}},
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const resource = this.getNodeParameter('resource', i) as string;
				const operation = this.getNodeParameter('operation', i) as string;

				// Get the operation definition from properties
				const operationDef = this.description.properties.find(
					(prop) =>
						prop.name === 'operation' &&
						prop.displayOptions?.show?.resource?.includes(resource),
				);

				if (!operationDef || operationDef.type !== 'options') {
					throw new Error(`Operation definition not found for ${resource}`);
				}

				const operationOption = operationDef.options?.find(
					(opt) => opt.value === operation,
				);

				if (!operationOption || !operationOption.routing) {
					throw new Error(`Routing not found for operation ${operation}`);
				}

				const { method, url } = operationOption.routing.request;

				// Build request based on routing configuration
				let requestUrl = url;
				const requestBody: IDataObject = {};
				const qs: IDataObject = {};

				// Collect all parameters for this operation
				const operationProperties = this.description.properties.filter(
					(prop) =>
						prop.displayOptions?.show?.resource?.includes(resource) &&
						prop.displayOptions?.show?.operation?.includes(operation) &&
						prop.name !== 'resource' &&
						prop.name !== 'operation',
				);

				// Process each parameter based on its routing configuration
				for (const prop of operationProperties) {
					const value = this.getNodeParameter(prop.name, i, '') as string | number | boolean;

					if (value === '' || value === null || value === undefined) {
						// Skip empty values unless required
						if (prop.required) {
							throw new Error(`Required parameter ${prop.name} is missing`);
						}
						continue;
					}

					if (prop.routing?.send) {
						const { type, property } = prop.routing.send;

						if (type === 'body') {
							requestBody[property || prop.name] = value;
						} else if (type === 'query') {
							qs[property || prop.name] = value;
						} else if (type === 'path') {
							// Replace path parameter in URL
							requestUrl = requestUrl.replace(`:${property || prop.name}`, String(value));
						}
					}
				}

				// Make the request using n8n's HTTP request helper
				const options = {
					method,
					url: requestUrl,
					body: Object.keys(requestBody).length > 0 ? requestBody : undefined,
					qs: Object.keys(qs).length > 0 ? qs : undefined,
					json: true,
				};

				const responseData = await this.helpers.httpRequest(options);

				// Add response to return data
				returnData.push({
					json: responseData as IDataObject,
					pairedItem: { item: i },
				});
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({
						json: {
							error: error.message,
						},
						pairedItem: { item: i },
					});
					continue;
				}
				throw error;
			}
		}

		return [returnData];
	}
}
