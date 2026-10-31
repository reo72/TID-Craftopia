export class ActionFormData{title(){return this;}body(){return this;}button(){return this;}async show(){return {canceled:true};}}
export class ModalFormData{title(){return this;}textField(){return this;}dropdown(){return this;}toggle(){return this;}async show(){return {canceled:true};}}
export const FormCancelationReason={UserBusy:'UserBusy',UserClosed:'UserClosed'};
