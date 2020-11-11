const mdToEs = require('../lib');

it('should index the data', async () => {
	expect.assertions(1);
	try {
		const res = await mdToEs({
			src: `${process.cwd()}/test-data`,
			elasticsearch_url: 'http://localhost:9200',
		});
		expect(res.length).toEqual(2);
	} catch (err) {
		throw err;
	}
});
