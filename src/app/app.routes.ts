import { Routes } from '@angular/router';
import { CapaComponent } from './web/capa/capa.component';

export const routes: Routes = [

  {
    path: '',
    children:[
      {
        path:'',
        component: CapaComponent
      }
    ]
  },
];
