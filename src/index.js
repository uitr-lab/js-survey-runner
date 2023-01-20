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




const labelTemplate=(label, renderer)=>{
	return Twig.twig({
	    data: label
	}).render(renderer.getFormData()||{});
}



SurveyRenderer.addItem('markdown', (item, container, renderer) => {


	
	var markdown= labelTemplate(item.text, renderer);
	

	var content = marked.parse(markdown);
	container.appendChild(new Element('span', {
		html: content
	}));


});


SurveyRenderer.addItem('textfield', (item, container, renderer) => {

	var label = null;

	if (item.label) {
		label = container.appendChild(new Element('label', {
			html: labelTemplate(item.label, renderer)
		}));

	}



	var input = (label || container).appendChild(new Element('input', {
		type: "text",
		name: labelTemplate(item.fieldName, renderer)
	}));

	if (item.placeholder) {
		input.setAttribute('placeholder', item.placeholder);
	}


});


SurveyRenderer.addItem('checkbox', (item, container, renderer) => {


	if(item.label){

		container=container.appendChild(new Element('label', {
			html: labelTemplate(item.label, renderer)
		}));

	}

	var checkbox=container.appendChild(new Element('input', {
		type:"checkbox",
		checked:!!item.checked,
		name:labelTemplate(item.fieldName, renderer)
	}));

	checkbox.addEventListener('change',()=>{
		if(!checkbox.checked){
			renderer.updateFormValue(item.fieldName, "off");
		}
	});


});

SurveyRenderer.addItem('radio', (item, container, renderer) => {


	if(item.label){

		container=container.appendChild(new Element('label', {
			html: labelTemplate(item.label, renderer)
		}));

	}



	var values=(item.values||['a', 'b', 'c']);

	var labels=null;

	if(typeof values=='string'){

		if(values[0]=='['){
			
			values=JSON.parse(values);
		
		}else if(values[0]=='{'){
			
			var obj=JSON.parse(values);
			values=Object.keys(obj);
			labels=[];
			values.forEach((v)=>{
				labels.push(obj[v]);
			});


		}else{

			values=values.split(',').map((v)=>{
				return v.trim();
			});


		}

	}

	labels=labels||(item.labels||values);


	if(typeof labels=='string'){

		if(labels[0]=='['){
			
			labels=JSON.parse(labels);
		
		}else{

			labels=labels.split(',').map((l)=>{
				return l.trim();
			});


		}

	}


	values.forEach((v, index)=>{




		var radio = container.appendChild(new Element('label', {
			"for":v,
			html:labelTemplate(labels[index], renderer)
		}));

		 radio.appendChild(new Element('input',{
				type:'radio',
				value:v,
				name:labelTemplate(item.fieldName, renderer)
			}))

	})


});

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

SurveyRenderer.addItem('script', (item, container, renderer) => {


	var script=item.script;

	if(script){

		var resp=((formData, renderer)=>{ return eval('(function(){ '+script+' })()')})( renderer.getFormData(), renderer);


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


SurveyRenderer.addItem('label', (item, container, renderer) => {


	container.appendChild(new Element('label', {
		html: labelTemplate(item.text, renderer)
	}));


});

SurveyRenderer.addItem('fieldset', (item, container, renderer) => {


	var fieldset=container.appendChild(new Element('fieldset', {

	}));

	if(item.legend){
		fieldset.appendChild(new Element('legend', {
			html:labelTemplate(item.legend, renderer)
		}));
	}

	(item.items||[]).forEach((item)=>{

		renderer.renderItem(item, fieldset);

	});



});