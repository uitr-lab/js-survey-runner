import  { EventEmitter } from  'events';



export class FormDataStorage extends EventEmitter {


	constructor(renderer, options){

		super();


		var key='formData';
		var currentKey=null;
		var waitingForNamespace=false;

		renderer.on('update', ()=>{

			var data=renderer.getFormData();

			

			if(typeof options.namespaceField=='string'){

				if(typeof data[options.namespaceField]!="string"||data[options.namespaceField]===""){
					waitingForNamespace=true;
					return;
				}

				key='formData.'+data[options.namespaceField];


				if(waitingForNamespace&&key!==currentKey){
					currentKey=key;
					//waitingForNamespace=false;


					var loadData=localStorage.getItem(key);

					if(loadData){

						loadData=JSON.parse(loadData);

						Object.keys(loadData).forEach((key)=>{
							if(key.indexOf('_')===0){
								//ignore config data
								delete loadData[key];
							}
						})

						renderer.setFormData(loadData);
					}

				}

				
			}
			localStorage.setItem(key, JSON.stringify(data));


		});
	 
	 }

}