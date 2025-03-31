import { Routes } from '@angular/router';
import { MapaComponent } from './web/mapa/mapa.component';
import { MapaPruebaComponent } from './web/mapa-prueba/mapa-prueba.component';
import { CapaComponent } from './web/capa/capa.component';

export const routes: Routes = [
  {
    path:'',
    component: CapaComponent
  },
  {
    path:'mapa',
    component: MapaPruebaComponent
  },
  {
    path:'capa',
    component: MapaComponent
  }
];
