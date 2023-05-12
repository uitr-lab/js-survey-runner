import  { EventEmitter } from  'events';



export class FormDataStorage extends EventEmitter {


	constructor(renderer, options){

		super();


		var key='formData';
		var waitingForNamespace=false;

		renderer.on('update', ()=>{

			var data=renderer.getFormData();

			

			if(typeof options.namespaceField=='string'){

				if(typeof data[options.namespaceField]!="string"||data[options.namespaceField]===""){
					waitingForNamespace=true;
					return;
				}

				key='formData.'+data[options.namespaceField];


				if(waitingForNamespace){
					waitingForNamespace=false;


					var loadData=localStorage.getItem(key);

					if(loadData){
						renderer.setFormData(JSON.parse(loadData));
					}

				}

				
			}
			localStorage.setItem(key, JSON.stringify(data));


		});
	 
	 }

}