import {
	SurveyRenderer
} from './SurveyRenderer.js'

import {
	Element
} from './Element.js'


import {
	marked
} from 'marked'


import Twig from 'twig'

import {
	toDataURL
} from 'qrcode'

import {
	Options
} from './helpers/Options.js'

import {
	GoogleSearchField,
	GeocodeFormat,
	GoogleMap
} from './helpers/GoogleSearchField.js'


import {
	SchemaValidator
} from './helpers/SchemaValidator.js'

import {
	FieldsetNavigation
} from './helpers/FieldsetNavigation.js'

import {
	FeedbackForm
} from './helpers/FeedbackForm.js'

import {
	FormDataStorage
} from './helpers/FormDataStorage.js'

import {
	NavMenu
} from './helpers/NavMenu.js'

import {
	DistinctChoice
} from './helpers/DistinctChoice.js'

import {
	AutoValidator
} from './helpers/AutoValidator.js'


window.FieldsetNavigation=FieldsetNavigation;
window.FeedbackForm=FeedbackForm;
window.FormDataStorage=FormDataStorage;
window.NavMenu=NavMenu;
window.DistinctChoice=DistinctChoice;
window.AutoValidator=AutoValidator;
window.SchemaValidator=SchemaValidator;


const labelTemplate=(label, renderer, field)=>{
	return renderer.formatLabel(label, field);
}

Twig.extendFilter('values', function(value) {
	return Object.keys(value).map((k)=>{
		return value[k];
	})
});

SurveyRenderer.setLabelFormatter((label, renderer, field)=>{

	try{
		return Twig.twig({
			data: label
		}).render(renderer.getFormData()||{});
	}catch(e){
		console.error(e);
		return label;
	}
});



SurveyRenderer.useFieldNamePrefixedParameterizer('_labels.');


SurveyRenderer.addItem('markdown', (item, container, renderer, page) => {

	var text=item.text;
    if(item.variableName){
		var variableContent= labelTemplate("{{"+item.variableName+"|default('EMPTY')}}", renderer);
		if(variableContent!=='EMPTY'){
			text=variableContent;
		}
	}

	
	var markdown= labelTemplate(text, renderer);
	

	var className=item.className||"";

	var content = marked.parse(markdown);
	var markdownEl=container.appendChild(new Element('span', {
		"class":"markdown"+(className?" "+className:""),
		html: content
	}));

	if((!content)||content===""){
		markdownEl.classList.add('empty');
	}



	

	if(item.updateContent){


		var updateContent=()=>{
			var markdown= labelTemplate(text, renderer);
			var content = marked.parse(markdown);
			markdownEl.innerHTML=content;
		}


		var throttleTimeout=null;

		var throttleUpdateContent=()=>{
			if(throttleTimeout){
				clearTimeout(throttleTimeout);
			}
			throttleTimeout=setTimeout(()=>{
				throttleTimeout=null;
				updateContent();
			}, 60);
		};


		page.on('update', throttleUpdateContent);

	}


});




SurveyRenderer.addItem('textfield', (item, container, renderer, page) => {

	var label = null;

	var fieldName=labelTemplate(item.fieldName, renderer);

	if (item.label) {
		label = container.appendChild(new Element('label', {
			for: fieldName,
			html: '<span>'+labelTemplate(item.label, renderer, item)+'</span>'
		}));

	}



	var input = (label || container).appendChild(new Element('input', {
		type: "text",
		name: fieldName
	}));


	if(item.format){
		renderer.getFormatter(item.format)(input, item);
	}

	if (item.placeholder) {
		input.setAttribute('placeholder', labelTemplate(item.placeholder, renderer));
	}

	
	
});

SurveyRenderer.addItem('textarea', (item, container, renderer, page) => {

	var label = null;

	var fieldName=labelTemplate(item.fieldName, renderer);

	if (item.label) {
		label = container.appendChild(new Element('label', {
			for: fieldName,
			html: '<span>'+labelTemplate(item.label, renderer, item)+'</span>'
		}));

	}

	var input = (label || container).appendChild(new Element('textarea', {
		name: fieldName
	}));

	if(item.format){
		renderer.getFormatter(item.format)(input, item);
	}

	if (item.placeholder) {
		input.setAttribute('placeholder', labelTemplate(item.placeholder, renderer));
	}

});


SurveyRenderer.addFormatter('time', (input, item)=>{
	input.type='time'
});

SurveyRenderer.addFormatter('date', (input, item)=>{
	input.type='date'
});

SurveyRenderer.addFormatter('month', (input, item)=>{
	input.type='month'
});

SurveyRenderer.addFormatter('auto-email', (input, item)=>{
	input.autocomplete='email'
});

SurveyRenderer.addFormatter('auto-tel', (input, item)=>{
	input.autocomplete='tel'
});

SurveyRenderer.addFormatter('capitalize', (input, item)=>{
	input.addEventListener('input',()=>{
		input.value=input.value.toUpperCase();
	});
});

SurveyRenderer.addFormatter('password', (input, item)=>{
	input.type='password'
});

SurveyRenderer.addFormatter('number', (input, item, min, max)=>{
	input.type='number';

	if(typeof min=='number'){
		input.min=min;
	}
	if(typeof max=='number'){
		input.max=max;
	}

	input.addEventListener('input',()=>{
		var v= parseFloat(input.value);
		if(typeof v=='number'&&!isNaN(v)){
			if(typeof min=='number'&&v<min){
				input.value=min;
			}
			if(typeof max=='number'&&v>min){
				input.value=max;
			}
		}
		
	});

	input.addEventListener('blur',()=>{

		if(!input.value){
			input.value=""; // valid symbols like . - remain, but input.value appears empty
			return;
		}

		var v= parseFloat(input.value);
		if(isNaN(v)){
			v=0;
			input.value=v;
		}
		if(typeof v=='number'){
			if(typeof min=='number'&&v<min){
				input.value=min;
			}
			if(typeof max=='number'&&v>min){
				input.value=max;
			}
		}
		
	});

});

SurveyRenderer.addFormatter('integer', (input, item, defaultValue)=>{
	
	input.type='number';

	input.addEventListener('input', ()=>{
		var v= parseInt(input.value);
		if(typeof v=='number'&&!isNaN(v)){
			input.value=v;
		}
		
	});

	input.addEventListener('blur',()=>{

		if(!input.value){
			input.value="";
			if(typeof defaultValue!='number'){
				//if a default value was not defined make this field empty
				return;
			}
		}

		var v= parseInt(input.value);
		if(isNaN(v)){
			v=0;
			if(typeof defaultValue=='number'){
				v=defaultValue;
			}
			input.value=v;
		}	
	});

});

SurveyRenderer.addFormatter('max', (input, item, field, offset)=>{
	
	input.addEventListener('input',()=>{
		var v= input.value;
		
	});

});

SurveyRenderer.addFormatter('replace', (input, item, pattern, replace)=>{
	input.pattern=pattern
	input.addEventListener('input', ()=>{
		var v= input.value;
		v=v.replace(new RegExp(pattern, 'g'), '');
		if(v!==input.value){
			input.value=v;
		}
	});
});


SurveyRenderer.addFormatter('geolocate', (input, item, format, renderer)=>{

	input.classList.add('with-geolocate');

	if(typeof renderer=="undefined"){
		renderer=format;
		format=null;
	}
	
	(new GoogleSearchField({
		emmiter:renderer,
		format:format,
		apiKey:renderer.getConfigValue('googleMapApiKey', ()=>{
			console.error('missing renderer.setConfigValue("googleMapApiKey", "XYZ...")')
		})
	})).addGeolocateButton(input).on('geocode', ()=>{
		renderer.needsUpdateValidation();
	});

});


SurveyRenderer.addFormatter('map', (input, item, format, renderer)=>{

	input.classList.add('with-map');

	if(typeof renderer=="undefined"){
		renderer=format;
		format=null;
	}
	
	(new GoogleMap({
		emmiter:renderer,
		format:format,
		apiKey:renderer.getConfigValue('googleMapApiKey', ()=>{
			console.error('missing renderer.setConfigValue("googleMapApiKey", "XYZ...")');
		}),
		center:renderer.getConfigValue('googleMapCenter', ()=>{
			console.error('missing renderer.setConfigValue("googleMapCenter", {lat:.., lng:...})');
		}),
		zoom:renderer.getConfigValue('googleMapZoom', ()=>{
			console.error('missing renderer.setConfigValue("googleMapZoom", z)');
			return 10;
		})
	})).addMapOverlayButton(input);

});


SurveyRenderer.addFormatter('geocode', (input, item, format, renderer)=>{
	
	input.classList.add('with-geocode');

	if(typeof renderer=="undefined"){
		renderer=format;
		format=null;
	}

	new GoogleSearchField(input, {
		emmiter:renderer,
		format:format,
		apiKey:renderer.getConfigValue('googleMapApiKey', ()=>{
			console.error('missing renderer.setConfigValue("googleMapApiKey", "XYZ...")')
		})
	});

});

SurveyRenderer.addFormatter('geocode.field', (input, item, field, format, renderer)=>{

	input.classList.add('with-geocode-field');

	if(typeof renderer=="undefined"){
		renderer=format;
		format=null;
	}

	//capture geocode value/part from another field
	

	var eventListener=(place, value)=>{

		if(!renderer.getElement().contains(input)){
			//console.log('stop listening!')
			renderer.off('geocode.'+field, eventListener);
			return;
		}

		(new GeocodeFormat()).applyFormat(input, place, format, value);
		renderer.needsUpdateValidation();
	}
	
	renderer.on('geocode.'+field, eventListener);

});




SurveyRenderer.addItem('checkbox', (item, container, renderer, page) => {

	var fieldName=labelTemplate(item.fieldName, renderer);

	if(item.label){

		var label=container.appendChild(new Element('label', {
			//for: fieldName, // for doesn't work unless id's match but nesting checkbox in the label works
			html: labelTemplate(item.label, renderer, item)
		}));

		if(item.showYesNo==="on"){
		
			label=container.appendChild(new Element('label', {
				//for: fieldName, // for doesn't work unless id's match but nesting checkbox in the label works
				html: labelTemplate(item.trueLabel, renderer, item)
			}));
		}

	}

	var checkbox=label.appendChild(new Element('input', {
		type:"checkbox",
		checked:!!item.checked,
		name:fieldName
	}));

	checkbox.addEventListener('change',()=>{
		if(!checkbox.checked){
			renderer.updateFormValue(fieldName, "off");
		}
	});


	if(item.showYesNo==="on"){
		var labelForNo=container.appendChild(new Element('label', {
			//for: fieldName, // for doesn't work unless id's match but nesting checkbox in the label works
			html: labelTemplate(item.falseLabel, renderer, item)
		}));

		var checkboxNo=labelForNo.appendChild(new Element('input', {
			type:"checkbox",
			//checked:!item.checked //don't automatically check this until first interaction
		}));

		if(renderer.getFormValue(fieldName)==="off"){
			checkboxNo.checked=true;
		}

		checkbox.addEventListener('change',()=>{
			checkboxNo.checked=!checkbox.checked;
		});
		checkboxNo.addEventListener('change',()=>{

			checkbox.checked=!checkboxNo.checked;
			if(!checkbox.checked){
				renderer.updateFormValue(fieldName, "off");
			}
			
			
		});
	}


});

SurveyRenderer.addItem('radio', (item, container, renderer, page) => {


	container=container.appendChild(new Element('span', {
		"class":"radio"
	}));


	var fieldName=labelTemplate(item.fieldName, renderer);

	if(item.label){

		container.appendChild(new Element('label', {
			for:fieldName,
			html: labelTemplate(item.label, renderer, item)
		}));

	}



	(new Options()).addStringFormatter((s)=>{ return labelTemplate(s, renderer); }).parseValueList(item, (option)=>{

		var radio = container.appendChild(new Element('label', {
			"for":fieldName+"_"+option.value + "_",

			html:labelTemplate(option.label, renderer, item)
		}));

		 radio.appendChild(new Element('input',{
			type:'radio',
			value:option.value,
			name: fieldName,
			id: fieldName+"_"+option.value + "_"
		}))

	})


});


SurveyRenderer.addItem('option', (item, container, renderer, page) => {


	var fieldName=labelTemplate(item.fieldName, renderer);

	container=container.appendChild(new Element('span', {
		for:fieldName,
		"class":"option"
	}));

	if(item.label){

		container.appendChild(new Element('label', {
			html: labelTemplate(item.label, renderer, item)
		}));

	}

	var select=container.appendChild(new Element('select',{
		"name":fieldName
	}));
	var optionList=null;
	var defaultPrintOptionItems=false;
	if(renderer.getConfigValue('printOptionItems', defaultPrintOptionItems)){
		optionList=container.appendChild(new Element('ul'));
		optionList.appendChild(new Element('li',{
			html:'<label>'+fieldName+' values: </label>'
		}));
	}

	container=select;

	container.appendChild(new Element('option',{
		disabled:true,
		selected:true,
		html:labelTemplate('select an option', renderer)
	}));


	

	(new Options()).addStringFormatter((s)=>{ return labelTemplate(s, renderer); }).parseValueList(item, (option)=>{

		var html=labelTemplate(option.label, renderer, item)
		container.appendChild(new Element('option',{
			value:option.value,
			html:html
		}))

		if(optionList){
			optionList.appendChild(new Element('li',{
				html:html
			}));
		}

	});


});


// SurveyRenderer.addItem('fieldtree', (item, container, renderer) => {



// 	var data=JSON.parse(item.data);
// 	if(!data){
// 		throw 'Invalid JSON';
// 	}


// 	container=container.appendChild(new Element('span', {
// 		"class":"fieldtree"
// 	}));


// 	renderer.renderItem(data.field, container);


	


// });

SurveyRenderer.addItem('defaultData', (item, container, renderer, page) => {


	var data=JSON.parse(item.data);
	if(data){

		Object.keys(data).forEach((key)=>{
			if(typeof renderer.getFormValue(key)=='undefined'){
				renderer.setFormValue(key, data[key]);
			}
		});

	}


});

SurveyRenderer.addItem('qrcode', (item, container, renderer, page) => {


	var data=item.data;
	if(data){

		data=labelTemplate(data, renderer);
		var opts={};
		if(item.size){
			var size=parseInt(item.size);
			if(size>=16){
				opts.width=size;
			}
		}
		
		var qrcode=container.appendChild(new Element('span',{"class":"qr-code"}));
		toDataURL(data, opts).then((data)=>{ qrcode.innerHTML = '<img style="" src="'+data+'"/>'; }); 
		

	}


});

SurveyRenderer.addItem('script', (item, container, renderer, page) => {


	var script=item.script;

	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();

		var resp=((formData, pageData, renderer, page)=>{ return eval(script); })( renderer.getFormData(), renderer.getPageData(), renderer, page);



		var handleResp=(resp)=>{

			if(!resp){
				return;
			}

			if(typeof resp.type=='string'){
				renderer.renderItem(resp, container);
			}

			if(Array.isArray(resp)){
				resp.forEach((item)=>{
					renderer.renderItem(item, container);
				});
			}


			if(resp instanceof HTMLElement){
				container.appendChild(resp);
			}

			if(typeof resp=='string'){
				container.appendChild(new Element('span',{
					html:labelTemplate(resp, renderer)
				}));
			}



			if(resp instanceof Promise){

				return resp.then((resp)=>{
					return handleResp(resp);
				});

			}

		}

		return handleResp(resp);


	}


});


SurveyRenderer.addItem('html', (item, container, renderer, page) => {


	var html=item.html;

	if(html){

		container.appendChild(new Element('span',{
			html:labelTemplate(html, renderer)
		}));

	}


});


SurveyRenderer.addItem('style', (item, container, renderer, page) => {


	var style=item.style;

	if(style){

		container.appendChild(new Element('style',{
			html:labelTemplate(style, renderer)
		}));

	}


});

SurveyRenderer.addItem('label', (item, container, renderer, page) => {


	var text=item.text;
    if(item.variableName){
		var variableContent= labelTemplate("{{"+item.variableName+"|default('EMPTY')}}", renderer);
		if(variableContent!=='EMPTY'){
			text=variableContent;
		}
	}


	container.appendChild(new Element('label', {
		html: labelTemplate(text, renderer)
	}));


});


SurveyRenderer.addItem('validation', (item, container, renderer, page) => {

	(new SchemaValidator(renderer)).addItemValidator(item, container, page);

});


SurveyRenderer.addItem('transform', (item, container, renderer, page) => {


	var script=item.script;


	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();


		renderer.addTransform((pageData)=>{

			/**
			 * page data object reference is passed for direct updates
			 */

			return ((pageData, renderer, page)=>{ return eval(script)})( pageData, renderer, page);

			

		});

	}


});


SurveyRenderer.addItem('template', (item, container, renderer, page) => {


	var variables=JSON.parse(labelTemplate(item.variables||'{}', renderer))||{};


	SurveyRenderer.addItem('template.'+item.template, (instance, container, renderer, page) => {


		var instanceVariables=JSON.parse(labelTemplate(instance.variables||'{}', renderer))||{};

		var vars={};
		
		Object.keys(variables).forEach((k)=>{
			vars[k]=variables[k];
		})

		Object.keys(instanceVariables).forEach((k)=>{
			vars[k]=instanceVariables[k];
		});



		return renderer.withVariables(vars, ()=>{
			return renderer.renderItem({
				type:"fieldset",
				items:item.items,
				classNames:item.classNames
			}, container);
		});
		

	});

});


SurveyRenderer.addItem('custom', (item, container, renderer, page) => {


	var variables=JSON.parse(labelTemplate(item.variables||'{}', renderer))||{};
	var vars={};
	
	Object.keys(variables).forEach((k)=>{
		vars[k]=variables[k];
	})




	var defaultRenderFn = (el)=>{  

		return renderer.withVariables(vars, ()=>{
			
			var returnVar = renderer.renderItem({
				type:"fieldset",
				items:item.items,
				classNames:item.classNames
			}, el||container);

			if(!(returnVar instanceof Promise)){
				returnVar=Promise.resolve(returnVar);
			}


			return returnVar.then((value)=>{
				renderer.needsUpdate();
				return value;
			});

		});



	};


	var script=item.renderScript;
	script=labelTemplate(script, renderer);

	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();

		var resp=((render, container, formData, pageData, renderer, page)=>{ return eval(script)})(defaultRenderFn, container, renderer.getFormData(), renderer.getPageData(), renderer, page);


	}


});

SurveyRenderer.addItem('fieldset', (item, container, renderer, page) => {


	var fieldset=container.appendChild(new Element('fieldset', {

	}));

	if(item.legend){
		fieldset.appendChild(new Element('legend', {
			html:labelTemplate(item.legend, renderer)
		}));
	}



	if(item.conditionScript){

		var script=labelTemplate(item.conditionScript, renderer);

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();

		var checkCondition=()=>{

			var result=((formData, pageData, renderer, page)=>{ return eval(script)})( renderer.getFormData(), renderer.getPageData(), renderer);

			if(result===false){
				fieldset.style.cssText='display:none;';
				fieldset.classList.add('condition-false');
				fieldset.classList.remove('condition-true');
				return;
			}




			fieldset.style.cssText='';
			fieldset.classList.remove('condition-false');
			fieldset.classList.add('condition-true');

		}

		var throttleTimeout=null;
		var throttleCheckCondition=()=>{

			// if(!renderer.getElement().contains(fieldset)){
			// 	//console.log('stop listening!')
			// 	page.off('update', throttleCheckCondition);
			// 	return;
			// }

			if(throttleTimeout){
				clearTimeout(throttleTimeout);
			}
			throttleTimeout=setTimeout(()=>{
				throttleTimeout=null;
				checkCondition();
			}, 30);
		};

		throttleCheckCondition();
		page.on('update', throttleCheckCondition);

	}


	if(item.classNames&&item.classNames.length>0){
		item.classNames.split(' ').filter((c)=>{ return c&&c.length>0}).forEach((c)=>{
			fieldset.classList.add(c);
		});
	}



	return Promise.all((item.items||[]).map((item)=>{

		var fieldVar = renderer.renderItem(item, fieldset);
		if(!(fieldVar instanceof Promise)){
			return Promise.resolve(true);
			
		}
		return fieldVar;

	}));



});