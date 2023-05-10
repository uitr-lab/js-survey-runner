import  { EventEmitter } from  'events';

import {
	SurveyRenderer
} from '../SurveyRenderer.js'


export class FeedbackForm extends EventEmitter {


	constructor(formUrl, postUrl){

		super();

		var renderer=new SurveyRenderer();
		renderer.setOptions({
			 completeLabel:"Send Feedback",
					 completePageHtml:"Feedback Sent! Thank you."
		});
		var feedback=formUrl||"feedback/feedback.json";
		var div=document.body.appendChild(new SurveyRenderer.Element('div', {
		  events:{
			 click:function(e){
				if(!div.classList.contains('active')){
				 div.classList.add('active');
				 div.classList.remove('hidden');
				 return;
			  }
			 }
		  }
		
	 
		}));
	 
		div.appendChild(renderer.render(feedback));
	 
		div.appendChild(new SurveyRenderer.Element('button',{
	 
		   events:{ click:function(e){ 
	 
			  e.stopPropagation();
			  e.preventDefault();
	 
			  if(div.classList.contains('active')){
				 div.classList.remove('active');
				 div.classList.add('hidden');
				 return;
			  }
			  div.classList.add('active');
			  div.classList.remove('hidden');
		   }}
		}))
	 
		div.classList.add('feedback');
		div.classList.add('hidden');
		renderer.on('complete', function(){
		   renderer.postFormData(postUrl||'feedback/submit.php');
		   setTimeout(function(){
			  div.classList.remove('active');
			  div.classList.add('hidden');
			  renderer.restart();
		   }, 2000);
		})
	 
	 }

}