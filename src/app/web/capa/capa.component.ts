import { Component, OnInit, ViewChild, ElementRef, inject, PLATFORM_ID, ChangeDetectorRef, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

//Las importaciones de prime
import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { SliderModule } from 'primeng/slider';
import { DataViewModule } from 'primeng/dataview';
import { ChartModule } from 'primeng/chart';


//importaciones de Leaftlet
import * as L from 'leaflet';
import 'leaflet-draw';

//importacion de servicios
import { MapaService } from '../servicios/mapa.service';

//importacion de environments
import { environment } from '../../../environments/environment';

// Interfaces
import { elementosMenu, detalleAdicional }  from './../componentes/interfaces/capa.interface';

@Component({
  selector: 'app-capa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ButtonModule,
    ScrollPanelModule,
    TooltipModule,
    AccordionModule,
    CardModule,
    PanelModule,
    SliderModule,
    DataViewModule,
    ChartModule
  ],
  templateUrl: './capa.component.html',
  styleUrls: ['./capa.component.scss'],
})
export class CapaComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  map!: L.Map;
  panelVisible = false;
  elementoSeleccionado: elementosMenu | null = null;
  private drawControl!: L.Control | any;
  private drawnItems!: L.FeatureGroup;
  markers = L.markerClusterGroup();
  indice: any;
  completo: any;
  sw: string = '';
  layerGroup: L.LayerGroup = L.layerGroup();

  //injectamos el servicio
  servicioMapa = inject(MapaService);
  botonMapa: string = environment.botonCapa;

  //aqui es donde se almacena las capas
  capasGeoJSONalmacenadas: any[] = [];

  panelVisible1: any = false;

  valorColor!: number;


  datosCard: any;
  optionesCard: any;
  platformId = inject(PLATFORM_ID);
  constructor(private cd: ChangeDetectorRef) {}


  // Menu items with detailed descriptions
  menuElementos: elementosMenu[] = [
    {
      nombreMenu: 'Información Estadística',
      icon: 'pi-database',
      sw: 1,
      description:'Explora datos estadísticos detallados con análisis profundos y visualizaciones comprehensivas.',
    },
    {
      nombreMenu: 'Capas Geográficas',
      icon: 'pi-list',
      sw: 2,
      description: 'Gestiona y personaliza diferentes capas geográficas con herramientas avanzadas de visualización.',
    },
    {
      nombreMenu: 'Capas Seleccionadas',
      icon: 'pi-map',
      sw: 3,
      description:'Administra, edita y exporta tus capas geográficas personalizadas con total flexibilidad.',
    }
  ];

  ngOnInit() {
    // Ensure map initialization after view is ready
    setTimeout(() => this.iniciarMapa(), 100);
    setTimeout(()=> this.iniciarChart(), 100);
  }


  iniciarMapa() {
    // Safely initialize Leaflet map
    if (this.mapContainer && this.mapContainer.nativeElement) {
      this.map = L.map(this.mapContainer.nativeElement, {
        center: [-16.5205316, -68.2064783],
        zoom: 6,
        minZoom: 2,
        maxZoom: 18,
        zoomControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 0.8,
      }).addTo(this.map);

      this.drawnItems = new L.FeatureGroup().addTo(this.map);

      L.control
        .zoom({
          position: 'bottomright',
        })
        .addTo(this.map);

      this.servicioMapa.indice().subscribe((resp: any) => {
        this.indice = resp;
        this.completo = JSON.parse(JSON.stringify(this.indice));
        this.indice = this.completo.filter((res: any) => res.sw == 1);
        console.log(resp);
        console.log(this.indice);
      });

      this.verificarCapasYActualizar();
      this.activarHerramientasDibujo();

      this.map.on((L as any).Draw.Event.CREATED, (e: any) => {
        let tipo = '';
        const capa = e.layer;
        // Obtener coordenadas
        let coordenadas: any;
        if (capa) {
          this.drawnItems.addLayer(capa); // Agregar la figura al mapa
          console.log( 'Para adicionar' + this.capasGeoJSONalmacenadas[0].nombre, capa.toGeoJSON().geometry);

          /*this.servicioMapa.comparar(this.capasGeoJSONalmacenadas[0].nombre,layer.toGeoJSON().geometry).subscribe((resp: any)=>{
            this.display = true;
            this.colSize = 'col-md-6';
            //this.planilla(resp[0].data,this.capasGeoJSONalmacenadas[0].ficha);
          })*/

          // Obtener tipo de geometría
          if (capa instanceof L.Circle) tipo = 'Círculo';
          else if (capa instanceof L.Polygon) tipo = 'Polígono';
          else if (capa instanceof L.Rectangle) tipo = 'Rectángulo';
          else if (capa instanceof L.Polyline) tipo = 'Línea';
          else if (capa instanceof L.Marker) tipo = 'Marcador';
          else tipo = 'Desconocido';

          console.log(tipo);

          if (capa instanceof L.Circle) {
            coordenadas = capa.getLatLng(); // Centro del círculo
          } else if ( capa instanceof L.Polygon || capa instanceof L.Polyline ) {
            coordenadas = capa.getLatLngs(); // Lista de coordenadas
          } else if (capa instanceof L.Marker) {
            coordenadas = capa.getLatLng(); // Punto exacto
          }
          // Mostrar detalles en un popup
          capa.bindPopup( `<b>Tipo:</b> ${tipo}<br><b>Coordenadas:</b> ${JSON.stringify(coordenadas)}`).openPopup();
        }
        console.log('Figura dibujada:', { tipo, coordenadas });
      });
    }
  }

  // Activar herramientas de dibujo solo si hay capas activas
  private activarHerramientasDibujo(): void {
    if (this.drawControl) {
      this.map.removeControl(this.drawControl); // Eliminar herramientas previas
    }

    this.drawControl = new (L.Control as any).Draw({
      edit: {
        featureGroup: this.drawnItems,
      },
      position: 'bottomright',
      draw: {
        polyline: false,
        polygon: true,
        circle: true,
        rectangle: false,
        marker: false,
        circlemarker: false,
      },
    });

    this.map.addControl(this.drawControl);

    // Capturar eventos cuando el usuario dibuja algo
    this.map.on((L as any).Draw.Event.CREATED, (event: any) => {
      const layer = event.layer;
      this.drawnItems.addLayer(layer);
      layer.bindPopup('Figura dibujada').openPopup();
      console.log('Figura dibujada - obteniendo detalles de capa lorem');
    });
  }

  // Verificar si hay capas activas y actualizar herramientas de dibujo
  private verificarCapasYActualizar(): void {
    if (Object.keys(this.capasGeoJSONalmacenadas).length > 0) {
      this.activarHerramientasDibujo();
      console.log("entrada aqui ");
    } else {
      console.log('No hay capas activas, herramientas de dibujo desactivadas.');
      if (this.drawControl) {
        this.map.removeControl(this.drawControl);
      }
    }
  }

  alternarPanel() {
    this.panelVisible = !this.panelVisible;
    // Reset selected item when closing panel
    if (!this.panelVisible) {
      this.elementoSeleccionado = null;
    }
  }

  // Toggle Detail Expansion
  toggleDetailExpansion(detalle: detalleAdicional) {
    detalle.expanded = !detalle.expanded;
  }

  //Cambia el ítem activo y filtra los datos correspondientes.
  evento(item: any) {
    console.log(item);
    this.sw = item.icon;
    this.elementoSeleccionado = item;
    this.indice = this.completo.filter((res: any) => res.sw == item.sw);
  }

  //Elimina una capa GeoJSON por su nombre.
  eliminarCapa(nombre: string) {
    const valor = this.capasGeoJSONalmacenadas.find(
      (res: any) => res.nombre == nombre,
    );

    if (valor.geojsonLayer) {
      this.layerGroup.removeLayer(valor.geojsonLayer);
      this.capasGeoJSONalmacenadas = this.capasGeoJSONalmacenadas.filter(
        (res: any) => res.nombre != nombre,
      );
    }
  }

  // Cambia la opacidad de una capa específica.
  cambiarOpacidad(nombre: string, e: any) {
    console.log(nombre + '  ' + e);
    const numero = +e.value;
    const valor = this.capasGeoJSONalmacenadas.find( (res: any) => res.nombre == nombre);
    valor.geojsonLayer.setStyle({
      opacity: numero,
      fillOpacity: numero,
    });
  }

  //Busca datos específicos basados en la opción seleccionada.
  opcion(data: any) {
    console.log(data);
    this.servicioMapa.buscar(data.opcion).subscribe((resp: any) => {
      this.capa(resp[0]);
    });
  }

  //Añade capas GeoJSON al mapa según el tipo de dato (polígono, punto, raster).
  capa(data: any) {
    console.log(data);
    this.servicioMapa.capas(data.nombre_tabla).subscribe((resp: any) => {
      if (this.capasGeoJSONalmacenadas.length == 0) {
        console.log(data.tipo);
        if (data.tipo == 'poligono') {
          this.agregaGeoJSONCapa(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
        if (data.tipo == 'punto') {
          this.agregaGeoJSONIcono(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
        if (data.tipo == 'raster') {
          this.agregaGeoJSONIcono(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
      } else {
        const valor = this.capasGeoJSONalmacenadas.find(
          (res: any) => res.nombre == data.nombre_tabla,
        );

        if (valor == undefined) {
          if (data.tipo == 'poligono') {
            this.agregaGeoJSONCapa(data, resp[0].row_to_json.features);
          }
          if (data.tipo == 'punto') {
            this.agregaGeoJSONIcono(data, resp[0].row_to_json.features);
          }
        }
      }
    });
  }

  //Añade una capa GeoJSON al mapa y la almacena en capasGeoJSONalmacenadas.
  agregaGeoJSONCapa(data: any, geojsonData: any) {
    console.log('Agregar una Capa');
    var geojsonLayer = L.geoJSON(geojsonData, {
      onEachFeature: this.agregarToolpipCapas,
      style: this.stylePoligon,
    });
    const valor = {
      nombre: data.nombre_tabla,
      ficha: data.ficha,
      titulo: data.titulo,
      subtitulo: data.subtitulo,
      opacidad: data.opacidad,
      geojsonLayer: geojsonLayer,
    };
    console.log(valor);
    console.log(geojsonLayer);
    this.capasGeoJSONalmacenadas.push(valor);
    this.layerGroup.addLayer(geojsonLayer).addTo(this.map);
  }

  // Añade tooltips a las capas.
  agregarToolpipCapas(caracteristica: any, capa: any) {
    if (caracteristica.properties) {
      var tooltipContent = `
          <div class="card" style="width: 18rem; text-align: justify;">
            <div class="card-body">
              ${caracteristica.properties.popup}
              hola comoe stas?
            </div>
          </div>
        `;
      capa.bindTooltip(tooltipContent).openTooltip();
    }
  }

  //Define el estilo de los polígonos en el mapa.
  stylePoligon(caracteristica: any) {
    return {
      weight: 2,
      color: '#000000',
      fillColor: '#000000',
      opacity: 0.5,
      fillOpacity: 0.5,
    };
  }

  //Añade marcadores agrupados al mapa.
  agregaGeoJSONIcono(data: any, geojsonData: any) {
    const geojsonLayer = L.geoJSON(geojsonData, {
      pointToLayer: (feature, latlng) => {
        const style = this.styleCentrosPoblados(feature);
        return L.circleMarker(latlng, style).bindTooltip(
          `<div>${feature.properties.titulo}</div> `,
          { direction: 'bottom', permanent: true },
        );
      },
    });
    this.markers.addLayer(geojsonLayer);
    const valor = {
      nombre: data.nombre_tabla,
      ficha: data.ficha,
      titulo: data.titulo,
      subtitulo: data.subtitulo,
      opacidad: data.opacidad,
      geojsonLayer: this.markers,
    };
    this.capasGeoJSONalmacenadas.push(valor);
    this.layerGroup.addLayer(this.markers).addTo(this.map);
  }

  styleCentrosPoblados(feature: any) {
    return {
      radius: 5,
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.5,
    };
  }


  iniciarChart() {
    if (isPlatformBrowser(this.platformId)) {
        const documentStyle = getComputedStyle(document.documentElement);
        const textColor = documentStyle.getPropertyValue('--p-text-color');
        const textColorSecondary = documentStyle.getPropertyValue('--p-text-muted-color');
        const surfaceBorder = documentStyle.getPropertyValue('--p-content-border-color');

        this.datosCard = {
            labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
            datasets: [
                {
                    label: 'My First dataset',
                    backgroundColor: documentStyle.getPropertyValue('--p-cyan-500'),
                    borderColor: documentStyle.getPropertyValue('--p-cyan-500'),
                    data: [65, 59, 80, 81, 56, 55, 40]
                },
                {
                    label: 'My Second dataset',
                    backgroundColor: documentStyle.getPropertyValue('--p-gray-500'),
                    borderColor: documentStyle.getPropertyValue('--p-gray-500'),
                    data: [28, 48, 40, 19, 86, 27, 90]
                }
            ]
        };

        this.optionesCard = {
            maintainAspectRatio: false,
            aspectRatio: 0.8,
            plugins: {
                legend: {
                    labels: {
                        color: textColor
                    }
                }
            },
            scales: {
                x: {
                    ticks: {
                        color: textColorSecondary,
                        font: {
                            weight: 500
                        }
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                },
                y: {
                    ticks: {
                        color: textColorSecondary
                    },
                    grid: {
                        color: surfaceBorder,
                        drawBorder: false
                    }
                }
            }
        };
        this.cd.markForCheck()
    }
}

}
