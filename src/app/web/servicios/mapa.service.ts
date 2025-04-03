import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class MapaService {

  //declarmaos la base url
  urlBase = environment.apiUrl;

  //inyectamos el http cliente
  http = inject(HttpClient);

  constructor() { }


  listaDepartamentos(){
    return this.http.get(`${this.urlBase}/mapa/listaDepartamennto`);
  }

  //para los departamentos
  departamentos(id:any){
    return this.http.post(`${this.urlBase}/mapa/departamento`,id);
  }




  //para la parte de los indices
  indice() {
    return this.http.get(`${this.urlBase}/dashboard/indice`);
  }
  //para comparar
  comparar(nombre: string, data: any) {

    const datos = {
      nombre: nombre,
      data: data
    }
    console.log(datos);
    return this.http.put(`${this.urlBase}/dashboard/comparar`,JSON.stringify(datos));
  }

  //para la ficha
  ficha_censal_disperso(codigos: string) {
    return this.http.get(`${this.urlBase}/dashboard/ficha_censal_disperso/${codigos}`);
  }

  buscar(id: number) {
    return this.http.get(`${this.urlBase}/dashboard/buscar/${id}`);
  }

  //para las capas
  capas(tabla: string) {
    return this.http.get(`${this.urlBase}/dashboard/capas/${tabla}`);
  }


}
