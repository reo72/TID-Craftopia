// A stand-in for @minecraft/server-ui (tests only). Every form shown is recorded in __forms ({t: title, body,
// buttons: [[text, icon]], fields}); answers come from setAnswers([...]) in order: a number picks a button, an array
// gives a modal form's values; no answer left = the form was closed.
export const __forms=[];let answers=[];
export function setAnswers(list){answers=[...list];}
export const FormCancelationReason={UserBusy:'UserBusy',UserClosed:'UserClosed'};
const reply=(record,modal)=>{__forms.push(record);if(!answers.length)return {canceled:true,cancelationReason:'UserClosed'};const a=answers.shift();
 return modal?{canceled:false,formValues:Array.isArray(a)?a:[a]}:{canceled:false,selection:a};};
export class ActionFormData{constructor(){this.r={t:'',body:'',buttons:[]};}title(t){this.r.t=t;return this;}body(b){this.r.body=b;return this;}
 button(text,icon){this.r.buttons.push([text,icon]);return this;}divider(){return this;}header(){return this;}label(){return this;}async show(){return reply(this.r,false);}}
export class ModalFormData{constructor(){this.r={t:'',fields:[]};}title(t){this.r.t=t;return this;}textField(l,p,o){this.r.fields.push(['text',l,p,o]);return this;}
 dropdown(l,opts,o){this.r.fields.push(['dropdown',l,opts,o]);return this;}toggle(l,o){this.r.fields.push(['toggle',l,o]);return this;}slider(l,a,b,o){this.r.fields.push(['slider',l,a,b,o]);return this;}
 submitButton(){return this;}async show(){return reply(this.r,true);}}
export class MessageFormData{constructor(){this.r={t:'',body:'',buttons:[]};}title(t){this.r.t=t;return this;}body(b){this.r.body=b;return this;}
 button1(t){this.r.buttons[0]=[t];return this;}button2(t){this.r.buttons[1]=[t];return this;}async show(){return reply(this.r,false);}}
