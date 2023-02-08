export class Options {

	addStringFormatter(fn){

		this._stringFormatters=this._stringFormatters||[];
		this._stringFormatters.push(fn);

		return this;
	}

	parseValueList(item, cb) {


		var values = (item.values || ['a', 'b', 'c']);

		var labels = null;

		if (typeof values == 'string') {

			(this._stringFormatters||[]).forEach((fn)=>{
				values = fn(values);
			});

			if (values[0] == '[') {

				values = JSON.parse(values);

			} else if (values[0] == '{') {

				var obj = JSON.parse(values);
				values = Object.keys(obj);
				labels = [];
				values.forEach((v) => {
					labels.push(obj[v]);
				});


			} else {

				values = values.split(',').map((v) => {
					return v.trim();
				});


			}

		}

		labels = labels || (item.labels || values);


		if (typeof labels == 'string') {

			(this._stringFormatters||[]).forEach((fn)=>{
				labels = fn(labels);
			});

			if (labels[0] == '[') {

				labels = JSON.parse(labels);

			} else {

				labels = labels.split(',').map((l) => {
					return l.trim();
				});


			}

		}


		values.forEach((v, index) => {


			cb({
				value: v,
				label: labels[index]
			});

		})



	}



}