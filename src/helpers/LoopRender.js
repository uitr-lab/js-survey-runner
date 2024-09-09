export class LoopRender {

	constructor(page) {
		this._page=page
		// this._addButtons=[];
	}

	renderFieldValueCount(fieldName, defaultRenderFn, container){

		var wrap=container.appendChild(new Element('div', {
			"class":"loop-render"
		}));

		var listItems=[];
		var _lastNum=-1
		var renderLoop=() => {

			var num;

			if(parseInt(fieldName)+""===fieldName){
				num=parseInt(fieldName);
			}else{
				num=parseInt(this._page.getFormData()[fieldName]);
			}
		   
		 

		   if(num===_lastNum||isNaN(num)){
		      return;
		   }
		   _lastNum=num;
		   var i=0;
		   while(i<num){

		     if(i>=listItems.length){
		        var vehicleEl=wrap.appendChild(new Element('div', {
		        	"class":"loop-item loop-item-"+i
		        }));
		        listItems.push(vehicleEl);
		        this._page.withVariables({"loopIndex":i}, ()=>{
		           defaultRenderFn(vehicleEl);
		        });
		     }else{
		        listItems[i].style.cssText='';
		     }
		     i++;
		   }
		   while(i<listItems.length){
		      listItems[i].style.cssText='display:none;';
		      i++;
		   }
		   
		};

		//setTimeout(()=>{
			//delay first render, so that caller has time to configure
			renderLoop();
		//}, 20);
		this._page.on('update', renderLoop);


		return this;

	}
	
	// addButton(elOpt, onClick){

	// 	this._addButtons.push((listEl)=>{
	// 		var btn = listEl.appendChild(new Element('button', elOpt));
	// 		btn.addEventListener('click', (e)=>{
	// 			onClick(listEl)
	// 		})
	// 	})

	// }
	
}
