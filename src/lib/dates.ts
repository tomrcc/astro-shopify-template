// Front matter dates have no time zone, so format in UTC to keep the day the editor picked.
export const formatDate = (date: Date) =>
	date.toLocaleDateString('en-NZ', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' });
