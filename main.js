function getAuthType() {
    var response = { type: 'NONE' };
    return response;
}

function getConfig(request) {
    var cc = DataStudioApp.createCommunityConnector();
    var config = cc.getConfig();

    config
        .newInfo()
        .setId('instructions')
        .setText(
            'Enter wikipedia article name to fetch their article views count. An invalid or blank entry will revert to the default value. Important: For a wikipdia page, e.g. https://en.wikipedia.org/wiki/Ice_cream, enter Ice_cream as the article name.'
        );

    config
        .newTextInput()
        .setId('articles')
        .setName(
            'Enter a single article name or multiple article names separated by commas.'
        )
        .setAllowOverride(true)
        .setHelpText('e.g. "Ice_cream" or "Ice_cream, Chocolate"')
        .setPlaceholder("Ice_cream, Chocolate");


    config.setDateRangeRequired(true);

    return config.build();
}

function getFields() {
    var cc = DataStudioApp.createCommunityConnector();
    var fields = cc.getFields();
    var types = cc.FieldType;
    var aggregations = cc.AggregationType;

    fields
        .newDimension()
        .setId('article')
        .setName('Article')
        .setType(types.TEXT);

    fields
        .newDimension()
        .setId('project')
        .setName('Project')
        .setType(types.TEXT);

    fields
        .newDimension()
        .setId('granularity')
        .setName('Granularity')
        .setType(types.TEXT);

    fields
        .newDimension()
        .setId('timestamp')
        .setName('Timestamp')
        .setType(types.YEAR_MONTH_DAY);

    fields
        .newDimension()
        .setId('access')
        .setName('Access')
        .setType(types.TEXT);

    fields
        .newDimension()
        .setId('agent')
        .setName('Agent')
        .setType(types.TEXT);

    fields
        .newMetric()
        .setId('views')
        .setName('Views')
        .setType(types.NUMBER)
        .setAggregation(aggregations.SUM);

    return fields;
}

function getSchema() {
    return { schema: getFields().build() };
}

function getData(request) {

    var requestedFieldIds = request.fields.map(function (field) {
        return field.name;
    });
    var requestedFields = getFields().forIds(requestedFieldIds);

    // build url
    function yyyymmdd(date) {
        return date.substring(0, 10).replace(/-/g, "");
    }

    var start = request.dateRange.startDate;
    var end = request.dateRange.endDate;
    var articles = request.configParams.articles.split(',');
    var frequency = 'daily';
    var locale = 'en.wikipedia';

    var rows = [];

    articles.forEach(function (article) {
        article = article.trim();
        var url = [
            'https://wikimedia.org/api/rest_v1/metrics/pageviews/per-article/',
            locale,
            '/all-access/all-agents/',
            article,
            '/',
            frequency,
            '/',
            yyyymmdd(start),
            '00',
            '/',
            yyyymmdd(end),
            '00'
        ];
        var response = JSON.parse(UrlFetchApp.fetch(url.join(''))).items;

        var data = [];
        response.forEach(function (item) {
            var values = [];
            requestedFields.asArray().forEach(function (field) {
                switch (field.getId()) {
                    case 'project':
                        values.push(item.project);
                        break;
                    case 'article':
                        values.push(item.article);
                        break;
                    case 'granularity':
                        values.push(item.granularity);
                        break;
                    case 'timestamp':
                        values.push(item.timestamp.substring(0, 8));
                        break;
                    case 'access':
                        values.push(item.access);
                        break;
                    case 'agent':
                        values.push(item.agent);
                        break;
                    case 'views':
                        values.push(item.views);
                        break;
                    default:
                        values.push('');
                }
            });
            data.push({
                values: values
            });
        });
        rows = rows.concat(data);
    });

    return {
        schema: requestedFields.build(),
        rows: rows
    };
}
