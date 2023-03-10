import {
	SurveyRunner
} from './SurveyRunner.js'

import {
	Element
} from './Element.js'


import {
	marked
} from 'marked'


import Twig from 'twig';

import {
	toDataURL
} from 'qrcode';


import {
	Options
} from './helpers/Options.js'


import  Schema  from 'async-validator';

const labelTemplate=(label, renderer)=>{


	label=renderer.localize(label);

	return Twig.twig({
	    data: label
	}).render(renderer.getFormData()||{});
}



SurveyRenderer.addItem('markdown', (item, container, renderer) => {


	
	var markdown= labelTemplate(item.text, renderer);
	

	var content = marked.parse(markdown);
	container.appendChild(new Element('span', {
		"class":"markdown",
		html: content
	}));


});


SurveyRenderer.addItem('textfield', (item, container, renderer) => {

	var label = null;

	var fieldName=labelTemplate(item.fieldName, renderer);

	if (item.label) {
		label = container.appendChild(new Element('label', {
			for: fieldName,
			html: '<span>'+labelTemplate(item.label, renderer)+'</span>'
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
		input.setAttribute('placeholder', item.placeholder);
	}


});


SurveyRenderer.addFormatter('time', (input, item)=>{

	input.type='time'

});

SurveyRenderer.addFormatter('password', (input, item)=>{

	input.type='password'

});


SurveyRenderer.addItem('checkbox', (item, container, renderer) => {

	var fieldName=labelTemplate(item.fieldName, renderer);

	if(item.label){

		container=container.appendChild(new Element('label', {
			for: fieldName,
			html: labelTemplate(item.label, renderer)
		}));

	}

	var checkbox=container.appendChild(new Element('input', {
		type:"checkbox",
		checked:!!item.checked,
		name:fieldName
	}));

	checkbox.addEventListener('change',()=>{
		if(!checkbox.checked){
			renderer.updateFormValue(item.fieldName, "off");
		}
	});


});

SurveyRenderer.addItem('radio', (item, container, renderer) => {


	container=container.appendChild(new Element('span', {
		"class":"radio"
	}));


	var fieldName=labelTemplate(item.fieldName, renderer);

	if(item.label){

		container.appendChild(new Element('label', {
			for:fieldName,
			html: labelTemplate(item.label, renderer)
		}));

	}



	(new Options()).addStringFormatter((s)=>{ return labelTemplate(s, renderer); }).parseValueList(item, (option)=>{

		var radio = container.appendChild(new Element('label', {
			"for":option.value,
			html:labelTemplate(option.label, renderer)
		}));

		 radio.appendChild(new Element('input',{
			type:'radio',
			value:option.value,
			name: fieldName
		}))

	})


});


SurveyRenderer.addItem('option', (item, container, renderer) => {


	var fieldName=labelTemplate(item.fieldName, renderer);

	container=container.appendChild(new Element('span', {
		for:fieldName,
		"class":"option"
	}));

	if(item.label){

		container.appendChild(new Element('label', {
			html: labelTemplate(item.label, renderer)
		}));

	}

	container=container.appendChild(new Element('select',{
		"name":fieldName
	}));


	container.appendChild(new Element('option',{
		disabled:true,
		selected:true,
		html:labelTemplate('select an option', renderer)
	}));

	(new Options()).addStringFormatter((s)=>{ return labelTemplate(s, renderer); }).parseValueList(item, (option)=>{

		container.appendChild(new Element('option',{
			value:option.value,
			html:labelTemplate(option.label, renderer)
		}))

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

SurveyRenderer.addItem('defaultData', (item, container, renderer) => {


	var data=JSON.parse(item.data);
	if(data){

		Object.keys(data).forEach((key)=>{
			if(typeof renderer.getFormValue(key)=='undefined'){
				renderer.setFormValue(key, data[key]);
			}
		});

	}


});

SurveyRenderer.addItem('qrcode', (item, container, renderer) => {


	var data=item.data;
	if(data){

		data=labelTemplate(data, renderer);
		
		var qrcode=container.appendChild(new Element('span',{"class":"qr-code"}));
		toDataURL(data).then((data)=>{ qrcode.innerHTML = '<img style="" src="'+data+'"/>'; }); 
		

	}


});

SurveyRenderer.addItem('script', (item, container, renderer) => {


	var script=item.script;

	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();

		var resp=((formData, pageData, renderer)=>{ return eval(script)})( renderer.getFormData(), renderer.getPageData(), renderer);



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


SurveyRenderer.addItem('html', (item, container, renderer) => {


	var html=item.html;

	if(html){

		container.appendChild(new Element('span',{
			html:labelTemplate(html, renderer)
		}));

	}


});


SurveyRenderer.addItem('style', (item, container, renderer) => {


	var style=item.style;

	if(style){

		container.appendChild(new Element('style',{
			html:labelTemplate(style, renderer)
		}));

	}


});

SurveyRenderer.addItem('label', (item, container, renderer) => {


	container.appendChild(new Element('label', {
		html: labelTemplate(item.text, renderer)
	}));


});


SurveyRenderer.addItem('validation', (item, container, renderer) => {


	var data=JSON.parse(item.data);
	if(data){

		var validationEl=container.appendChild(new Element('span', {"class":"validation"}));

		const validator = new Schema(data);

		renderer.addValidator((formData, pageData)=>{

			return validator.validate(pageData).then(()=>{


				Object.keys(data).forEach((field)=>{
					renderer.getInput(field).removeAttribute('data-validation-error');
				});


			}).catch(({ errors, fields })=>{

				Object.keys(data).forEach((field)=>{
					renderer.getInput(field).removeAttribute('data-validation-error');
				});
				
				Object.keys(fields).forEach((field ,i)=>{
					renderer.getInput(field).setAttribute('data-validation-error',errors[i].message);
				});

				throw {errors:errors, fields:fields};

			});

		})

	}


});


SurveyRenderer.addItem('transform', (item, container, renderer) => {


	var script=item.script;


	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();


		renderer.addTransform(()=>{

			var resp=((pageData, renderer)=>{ return eval(script)})( renderer.getPageData(), renderer);

			if(!resp){
				return;
			}

			renderer.updateFormValues(resp);

		});

	}


});


SurveyRenderer.addItem('template', (item, container, renderer) => {


	var variables=JSON.parse(labelTemplate(item.variables||'{}', renderer))||{};


	SurveyRenderer.addItem('template.'+item.template, (instance, container, renderer) => {


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


SurveyRenderer.addItem('custom', (item, container, renderer) => {


	var variables=JSON.parse(labelTemplate(item.variables||'{}', renderer))||{};
	var vars={};
	
	Object.keys(variables).forEach((k)=>{
		vars[k]=variables[k];
	})




	var defaultRenderFn = (el)=>{  

		renderer.withVariables(vars, ()=>{
			return renderer.renderItem({
				type:"fieldset",
				items:item.items,
				classNames:item.classNames
			}, el||container);
		});

	};


	var script=item.renderScript;

	if(script){

		script='(function(){ '+"\n"+script+"\n"+' })() '+renderer.getSourceUrl();

		var resp=((render, container, formData, pageData, renderer)=>{ return eval(script)})(defaultRenderFn, container, renderer.getFormData(), renderer.getPageData(), renderer);


	}


});

SurveyRenderer.addItem('fieldset', (item, container, renderer) => {


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

			var result=((formData, pageData, renderer)=>{ return eval(script)})( renderer.getFormData(), renderer.getPageData(), renderer);

			if(result===false){
				fieldset.style.cssText='display:none;';
				return;
			}




			fieldset.style.cssText='';
			

		}

		checkCondition();
		renderer.on('update', checkCondition);

	}


	if(item.classNames&&item.classNames.length>0){
		item.classNames.split(' ').filter((c)=>{ return c&&c.length>0}).forEach((c)=>{
			fieldset.classList.add(c);
		});
	}



	(item.items||[]).forEach((item)=>{

		renderer.renderItem(item, fieldset);

	});



});