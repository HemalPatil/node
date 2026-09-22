export default async function* coverageListener(source: any) {
	for await (const event of source) {
		if (event.type === 'test:coverage') {
			console.debug(`[DEBUG] mcdc: event.data`, event.data);
		}
	}
}
