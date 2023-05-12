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

		if(typeof config=='undefined'&&!(input instanceof HTMLElement)){
			config=input;
			input=null;
		}

		this._config=config||{};

		if(input instanceof HTMLElement){
			this.addInputSearch(input);
		}
	}

	addGeolocate(input){

		if (navigator.geolocation) {
		
			var _loading=false;

			var btn=new Element('button', {
				"class":"geolocate",
				"html":"Use Current Location",
				events:{
					click:(e)=>{
	
						e.stopPropagation();
						e.preventDefault();
	
						if(_loading){
							return;
						}
						_loading=true;

						btn.classList.add('loading');
						navigator.geolocation.getCurrentPosition((position)=>{
							btn.classList.add('success');
							btn.classList.remove('loading');
							console.log(position);
							_loading=false;

							if(!GoogleApiLoader._loader){
								GoogleApiLoader._loader=new GoogleApiLoader(this._config);
							}
					
							GoogleApiLoader._loader.onLoaded(()=>{


								(new google.maps.Geocoder()).geocode({
									location:{lat:position.coords.latitude, lng:position.coords.longitude}
								}, (results, status)=>{
									console.log(results);

									if(status!=="OK"){

										return;
									}

									if(this._config.emmiter){
										this._config.emmiter.emit('geocode.'+input.name, results[0], input.value);
									}

									if(this._config.format){
										(new GeocodeFormat()).applyFormat(input, results[0], this._config.format, input.value);
									}
					

								});
							
							})


						}, (error)=>{
							btn.classList.add('error');
							btn.classList.remove('loading');
							console.log(error);
							_loading=false;
						}, {
	
						});
	
					}
				}
			})
			
			input.after(btn);
	
		}



	}

	addInputSearch(input){

		if(!input){
			return;
		}

		if(!GoogleApiLoader._loader){
			GoogleApiLoader._loader=new GoogleApiLoader(this._config);
		}

		GoogleApiLoader._loader.onLoaded(()=>{

			var autocomplete=new google.maps.places.Autocomplete(input);

			autocomplete.addListener("place_changed", () => {

				var place = autocomplete.getPlace();
				console.log(place);

				if(this._config.emmiter){
					this._config.emmiter.emit('geocode.'+input.name, place, input.value);
				}

				if(this._config.format){
					(new GeocodeFormat()).applyFormat(input, place, this._config.format, input.value);
				}


			});

		});

	}


}


export class GoogleMap{

	constructor(config){
		this._config=config||{};
	}

	renderMapOverlay(input){

		var btn=new Element('button', {
			"class":"maplocate",
			"html":"Find on map",
			events:{
				click:(e)=>{

					e.stopPropagation();
					e.preventDefault();
				}
			}
		});

		input.after(btn);


	}

	renderMap(div, input, callback){

		if(!GoogleApiLoader._loader){
			GoogleApiLoader._loader=new GoogleApiLoader(this._config);
		}

		GoogleApiLoader._loader.onLoaded(()=>{

			const position = { lat: -25.344, lng: 131.031 };
	
			var map = new google.maps.Map(div, {
				zoom: 4,
				center: position,
				mapId: "DEMO_MAP_ID",
			});


			callback(map);


		});

		
	}

}

export class GeocodeFormat{

	format(place, format, currentValue){
		
		for(var i=0;i<place.address_components.length;i++){

			if(format==='po'&&place.address_components[i].types.indexOf('postal_code')>=0){
				return place.address_components[i].short_name;
			}

			if(format==='city'&&place.address_components[i].types.indexOf('locality')>=0){
				return place.address_components[i].short_name;
			}

			if(format==='province'&&place.address_components[i].types.indexOf('administrative_area_level_1')>=0){
				return place.address_components[i].long_name;
			}

			if(format==='street_number'&&place.address_components[i].types.indexOf('street_number')>=0){
				return place.address_components[i].short_name;
			}

			if(format==='address'&&place.address_components[i].types.indexOf('route')>=0){


				var streetNumber=this.format(place, 'street_number');

				if(streetNumber){
					streetNumber+=' ';
				}

				if(!currentValue){
					return streetNumber+place.address_components[i].long_name;
				}
				var cmp=place.address_components[i];

				//leave prefix street number
				if(currentValue.indexOf(cmp.short_name)>=0){
					return currentValue.split(cmp.short_name).shift()+cmp.short_name;
				}

				if(currentValue.indexOf(cmp.long_name)>=0){
					return currentValue.split(cmp.short_name).shift()+cmp.long_name;
				}


				return streetNumber+cmp.long_name;

			}

			if(format==='street'&&place.address_components[i].types.indexOf('route')>=0){

				if(!currentValue){
					return place.address_components[i].long_name;
				}
				var cmp=place.address_components[i];

				//leave prefix street number
				if(currentValue.indexOf(cmp.short_name)>=0){
					return currentValue.split(cmp.short_name).shift()+cmp.short_name;
				}

				if(currentValue.indexOf(cmp.long_name)>=0){
					return currentValue.split(cmp.short_name).shift()+cmp.long_name;
				}

				return cmp.long_name;

			}

		}
	}

	applyFormat(input, place, format, defaultValue){

		var formatted=this.format(place, format, input.value);
		if(!(formatted||input.value)){
			input.value=defaultValue;
			return;
		}

		if(formatted){
			input.value=formatted;
		}

	}


}