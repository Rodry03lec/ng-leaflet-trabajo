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

  //para busqueda general de departamentos y municipios
  busquedaDepMun(nombre:any){
    return this.http.post(`${this.urlBase}/mapa/buscarDepMun`, nombre);
  }

  //para ver los detalles de lo que envien
  deparMunicipioVer(id: any, tipo: any) {
    return this.http.post(`${this.urlBase}/mapa/departamentoMunicipioVer`, { id, tipo });
  }

  //para la parte de los puntos prueba
  pruebaPuntosGet(){
    return this.http.get(`${this.urlBase}/mapa/pruebaPunto`);
  }

}
