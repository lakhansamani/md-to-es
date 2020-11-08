const { indexData } = require('../utils');

async function main({
	src,
	elasticsearch_url,
	elasticsearch_index,
	preview_length,
}) {
	const newOptions = {
		src,
		elasticsearchURL: elasticsearch_url,
		elasticsearchIndex: elasticsearchIndex,
		previewLength: preview_length,
	};

	if (!src) {
		throw new Error(`Files source path is required`);
	}

	if (!elasticsearch_url) {
		throw new Error(`Elasticsearch cluster url is required`);
	}

	if (!elasticsearch_index) {
		newOptions.elasticsearchIndex = `markdown_data`;
	}

	if (!preview_length) {
		newOptions.previewLength = 70;
	}

	try {
		indexData(newOptions);
	} catch (err) {
		throw err;
	}
}

module.exports = main;
