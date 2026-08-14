export interface MairieContact {
	name: string;
	/** Empty when no national phone directory is wired for this country. */
	phoneDisplay: string;
	/** Empty or `tel:` URI when a phone number is available. */
	phoneTel: string;
	website?: string;
	fetchedAt: string;
}
