import {
  Component,
  OnInit,
  ViewChild,
  ElementRef,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { SliderModule } from 'primeng/slider';
import { DataViewModule } from 'primeng/dataview';

import * as L from 'leaflet';
import 'leaflet-draw';
import { MapaService } from '../servicios/mapa.service';
import { environment } from '../../../environments/environment';

import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';

// Interfaces for type safety
interface MenuItem {
  label: string;
  icon: string;
  sw: number;
  description: string;
}

interface AdditionalDetail {
  title: string;
  content: string;
  expanded: boolean;
}

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
  ],
  templateUrl: './capa.component.html',
  styleUrls: ['./capa.component.scss'],
})
export class CapaComponent implements OnInit, OnDestroy {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  map!: L.Map;
  panelVisible = false;
  selectedItem: MenuItem | null = null;
  private drawControl!: L.Control | any;
  private drawnItems!: L.FeatureGroup;
  markers = L.markerClusterGroup();
  private selectedLayer: null = null; // Capa seleccionada
  indice: any;
  completo: any;
  sw: string = '';
  layerGroup: L.LayerGroup = L.layerGroup();

  //injectamos el servicio
  servicioMapa = inject(MapaService);
  botonMapa: string = environment.botonCapa;

  //aqui es donde se almacena las capas
  namedGeoJSONLayers: any[] = [];

  panelVisible1: any = false;

  // Menu items with detailed descriptions
  items: MenuItem[] = [
    {
      label: 'Información Estadística',
      icon: 'pi-database',
      sw: 1,
      description:
        'Explora datos estadísticos detallados con análisis profundos y visualizaciones comprehensivas.',
    },
    {
      label: 'Capas Geográficas',
      icon: 'pi-list',
      sw: 2,
      description:
        'Gestiona y personaliza diferentes capas geográficas con herramientas avanzadas de visualización.',
    },
    {
      label: 'Capas Seleccionadas',
      icon: 'pi-map',
      sw: 3,
      description:
        'Administra, edita y exporta tus capas geográficas personalizadas con total flexibilidad.',
    },
  ];

  ngOnInit() {
    // Ensure map initialization after view is ready
    setTimeout(() => this.iniciarMapa(), 100);
  }

  ngOnDestroy() {
    // Properly remove map to prevent memory leaks
    if (this.map) {
      this.map.remove();
    }
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
        const layer = e.layer;
        // Obtener coordenadas
        let coordenadas: any;
        if (layer) {
          this.drawnItems.addLayer(layer); // Agregar la figura al mapa
          console.log(
            'Para adicionar' + this.namedGeoJSONLayers[0].nombre,
            layer.toGeoJSON().geometry,
          );

          /*this.servicioMapa.comparar(this.namedGeoJSONLayers[0].nombre,layer.toGeoJSON().geometry).subscribe((resp: any)=>{
            this.display = true;
            this.colSize = 'col-md-6';
            //this.planilla(resp[0].data,this.namedGeoJSONLayers[0].ficha);
          })*/

          // Obtener tipo de geometría
          if (layer instanceof L.Circle) tipo = 'Círculo';
          else if (layer instanceof L.Polygon) tipo = 'Polígono';
          else if (layer instanceof L.Rectangle) tipo = 'Rectángulo';
          else if (layer instanceof L.Polyline) tipo = 'Línea';
          else if (layer instanceof L.Marker) tipo = 'Marcador';
          else tipo = 'Desconocido';

          console.log(tipo);

          if (layer instanceof L.Circle) {
            coordenadas = layer.getLatLng(); // Centro del círculo
          } else if (
            layer instanceof L.Polygon ||
            layer instanceof L.Polyline
          ) {
            coordenadas = layer.getLatLngs(); // Lista de coordenadas
          } else if (layer instanceof L.Marker) {
            coordenadas = layer.getLatLng(); // Punto exacto
          }

          // Mostrar detalles en un popup
          layer
            .bindPopup(
              `<b>Tipo:</b> ${tipo}<br><b>Coordenadas:</b> ${JSON.stringify(coordenadas)}`,
            )
            .openPopup();
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
    if (Object.keys(this.namedGeoJSONLayers).length > 0) {
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
      this.selectedItem = null;
    }
  }

  // Action Performance Method
  performAction(actionType: string) {
    // Placeholder for future implementation
    switch (actionType) {
      case 'generate-report':
        console.log('Generando reporte PDF...');
        break;
      case 'view-charts':
        console.log('Abriendo visualización de datos...');
        break;
      case 'add-layer':
        console.log('Añadiendo nueva capa...');
        break;
      case 'configure-layers':
        console.log('Configurando capas...');
        break;
      case 'edit-layers':
        console.log('Editando capas...');
        break;
      case 'export-layers':
        console.log('Exportando capas...');
        break;
    }
  }

  // Toggle Detail Expansion
  toggleDetailExpansion(detail: AdditionalDetail) {
    detail.expanded = !detail.expanded;
  }

  // Actualizar los detalles de los puntos según el nivel de zoom
  private actualizarDetallesSegunZoom(): void {
    if (!this.selectedLayer || !this.namedGeoJSONLayers[this.selectedLayer]) {
      return;
    }
    const selectedLayer = this.namedGeoJSONLayers[this.selectedLayer];

    selectedLayer.eachLayer((layer: any) => {
      if (layer instanceof L.CircleMarker) {
        const feature: any = (layer as any).feature;
        this.actualizarPopup(feature, layer);
      }
    });
  }

  // Actualizar la información del popup en función del zoom
  private actualizarPopup(feature: any, layer: L.Layer): void {
    const zoom = this.map.getZoom();
    let detalle = `<b>${feature.properties.nombre}</b>`;

    if (zoom >= 10) {
      detalle += `<br>Descripción: ${feature.properties.descripcion}`;
    }

    layer.bindPopup(detalle);
    console.log('hola');
  }

  //Cambia el ítem activo y filtra los datos correspondientes.
  evento(item: any) {
    console.log(item);
    this.sw = item.icon;
    this.selectedItem = item;
    this.indice = this.completo.filter((res: any) => res.sw == item.sw);
  }

  //Elimina una capa GeoJSON por su nombre.
  eliminarCapa(nombre: string) {
    const valor = this.namedGeoJSONLayers.find(
      (res: any) => res.nombre == nombre,
    );

    if (valor.geojsonLayer) {
      this.layerGroup.removeLayer(valor.geojsonLayer);
      this.namedGeoJSONLayers = this.namedGeoJSONLayers.filter(
        (res: any) => res.nombre != nombre,
      );
    }
  }

  // Cambia la opacidad de una capa específica.
  cambiarOpacidad(nombre: string, e: any) {
    console.log(nombre + '  ' + e);
    /* const numero = +e.value;
      const valor = this.namedGeoJSONLayers.find(
        (res: any) => res.nombre == nombre,
      );
      valor.geojsonLayer.setStyle({
        opacity: numero,
        fillOpacity: numero,
      }); */
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
      if (this.namedGeoJSONLayers.length == 0) {
        console.log(data.tipo);
        if (data.tipo == 'poligono') {
          this.addGeoJSONLayer(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
        if (data.tipo == 'punto') {
          this.addGeoJSONIcon(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
        if (data.tipo == 'raster') {
          this.addGeoJSONIcon(data, resp[0].row_to_json.features);
          console.log(data, resp[0].row_to_json.features);
        }
      } else {
        const valor = this.namedGeoJSONLayers.find(
          (res: any) => res.nombre == data.nombre_tabla,
        );

        if (valor == undefined) {
          if (data.tipo == 'poligono') {
            this.addGeoJSONLayer(data, resp[0].row_to_json.features);
          }
          if (data.tipo == 'punto') {
            this.addGeoJSONIcon(data, resp[0].row_to_json.features);
          }
        }
      }
    });
  }

  //Añade una capa GeoJSON al mapa y la almacena en namedGeoJSONLayers.
  addGeoJSONLayer(data: any, geojsonData: any) {
    console.log('Agregar una Capa');
    var geojsonLayer = L.geoJSON(geojsonData, {
      onEachFeature: this.onEachFeature,
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
    this.namedGeoJSONLayers.push(valor);
    this.layerGroup.addLayer(geojsonLayer).addTo(this.map);
  }

  // Añade tooltips a las capas.
  onEachFeature(features: any, layer: any) {
    if (features.properties) {
      var tooltipContent = `
          <div class="card" style="width: 18rem; text-align: justify;">
            <div class="card-body">
              ${features.properties.popup}
            </div>
          </div>
        `;
      layer.bindTooltip(tooltipContent).openTooltip();
    }
  }

  //Define el estilo de los polígonos en el mapa.
  stylePoligon(feature: any) {
    return {
      weight: 2,
      color: '#000000',
      fillColor: '#000000',
      opacity: 0.5,
      fillOpacity: 0.5,
    };
  }

  //Añade marcadores agrupados al mapa.
  addGeoJSONIcon(data: any, geojsonData: any) {
    console.log(data);
    const geojsonLayer = L.geoJSON(geojsonData, {
      pointToLayer: (feature, latlng) => {
        const style = this.style_Centros_Poblados_2023_0_0(feature);
        return L.circleMarker(latlng, style).bindTooltip(
          `<div>${feature.properties.titulo}</div> PRUEBA `,
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
    this.namedGeoJSONLayers.push(valor);
    this.layerGroup.addLayer(this.markers).addTo(this.map);
  }

  style_Centros_Poblados_2023_0_0(feature: any) {
    return {
      radius: 5,
      color: 'red',
      fillColor: 'red',
      fillOpacity: 0.5,
    };
  }
}
