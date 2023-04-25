import {
	EventEmitter
} from 'events';



class GoogleApiLoader extends EventEmitter {

	constructor(config) {

		super();

		window._loadGooglePlaces=()=>{
			this._loading=false;
			this._loaded=true;
			this.emit('load');
		};

		document.head.appendChild(new Element("script", {
            "src":'//maps.google.com/maps/api/js?libraries=places&callback=window._loadGooglePlaces&key='+config.apiKey+'&v=quarterly', 
            "type":"text/javascript",
            "async":"async",
            "defer":"defer"
        }));


	}

	onLoaded(cb){

		if(this._loaded){

			cb();
			return;
		}

		this.on('load', cb);

	}


}

export class GoogleSearchField{

	constructor(input, config) {

		if(!GoogleSearchField._loader){
			GoogleSearchField._loader=new GoogleApiLoader(config);
		}

		GoogleSearchField._loader.onLoaded(()=>{

			new google.maps.places.Autocomplete(input);

		});

	}


}