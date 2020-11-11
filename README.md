# MD-TO-ES (Markdown to Elasticsearch)

Module to index your markdown data to Elasticsearch and empower your site with greate search experience.
One can use [ReactiveSearch](https://opensource.appbase.io/reactivesearch/) to build the search experience on top of ElasticSearch data.

# Quick Start

This module is available in 2 forms.

## CLI

- Install the package globally `npm install -g md-to-es`
- Usage `md-to-es --src=CONTENT_DIR --elasticsearch_url=ElasticSearch_Cluster_URL`
- Other Options
  ```
  Options:
    --version                  Show version number                                [boolean]
    -s, --src                  source directory containing markdown files         [required]
    -e, --elasticsearch_url    elasticsearch cluster url                          [required]
    -i, --elasticsearch_index  elasticsearch index name. By default it will use `markdown_data` as the index name
    -p, --preview_length       preview content length. Defaults to first 70 chars of the content
    --help                     Show help                                          [boolean]
  ```

## Node module

- Install the package `npm install md-to-es`
- Usage

  ```js
  const mdToEs = require('md-to-es');

  async function indexData() {
    try {

      await mdToEs({
        src: `path source directory containing markdown / mdx files [required]`,
        elasticsearch_url: `elasticsearch cluster url [required]`,
        elasticsearch_index: `elasticsearch index name where data is to be indexed. [Optional] [Default value: markdown_data]`
        preview_length: 70 // preview content length, defaults to first 70 chars of content
      })
    } catch(err) {
      throw err;
    }
  }
  ```
