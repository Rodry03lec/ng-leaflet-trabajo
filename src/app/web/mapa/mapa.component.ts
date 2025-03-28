import { Component, OnInit } from '@angular/core';
import * as L from 'leaflet';
import 'leaflet-draw';
import { HttpClient } from '@angular/common/http';
import { HttpClientModule } from '@angular/common/http';


import { PanelMenuModule } from 'primeng/panelmenu';
import { PanelMenu } from 'primeng/panelmenu';
import { MenuItem } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { MegaMenuModule } from 'primeng/megamenu';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { HeaderComponent } from "../componentes/header/header.component";
import { ScrollPanelModule } from 'primeng/scrollpanel';


@Component({
  selector: 'app-mapa',
  imports: [HttpClientModule, PanelMenuModule, ButtonModule, MegaMenuModule, TooltipModule, AccordionModule, HeaderComponent, ScrollPanelModule],
  templateUrl: './mapa.component.html',
  styleUrls: ['./mapa.component.scss'],
})
export class MapaComponent implements OnInit {
  private map!: L.Map;
  geoJsonLayers: Record<string, L.GeoJSON> = {}; // Diccionario de capas activas
  private selectedLayer: string | null = null; // Capa seleccionada
  private currentZoom!: number; // Nivel de zoom actual
  private drawnItems!: L.FeatureGroup;
  private drawControl!: L.Control | any;

  selectedCard:number = 1;

  items!: MenuItem[];

  constructor(private http: HttpClient) {}

  ngOnInit(): void {
    this.iniciarMapa();
    this.funItem();
  }

  private iniciarMapa(): void {
    this.map = L.map('map', {
      center: [-16.5205316, -68.2064783],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    // Grupo donde se almacenarán las figuras dibujadas
    this.drawnItems = new L.FeatureGroup();
    this.map.addLayer(this.drawnItems);

    // Verifica si hay capas activas antes de agregar herramientas de dibujo
    this.verificarCapasYActualizar();

    // Detectar cambios en el zoom y actualizar detalles
    this.map.on('zoomend', () => {
      this.currentZoom = this.map.getZoom();
      console.log('Zoom actual:', this.currentZoom);
      this.actualizarDetallesSegunZoom();
    });

    // Escuchar cambios en las capas
    this.map.on('overlayadd', () => this.verificarCapasYActualizar());
    this.map.on('overlayremove', () => this.verificarCapasYActualizar());

    // Capturar evento cuando el usuario dibuja una figura
    this.map.on((L as any).Draw.Event.CREATED, (event: any) => {
      let tipo = '';
      const layer = event.layer;
      this.drawnItems.addLayer(layer); // Agregar la figura al mapa

      // Obtener tipo de geometría
      if (layer instanceof L.Circle) tipo = 'Círculo';
      else if (layer instanceof L.Polygon) tipo = 'Polígono';
      else if (layer instanceof L.Rectangle) tipo = 'Rectángulo';
      else if (layer instanceof L.Polyline) tipo = 'Línea';
      else if (layer instanceof L.Marker) tipo = 'Marcador';
      else tipo = 'Desconocido';

      console.log(tipo);

      // Obtener coordenadas
      let coordenadas: any;
      if (layer instanceof L.Circle) {
        coordenadas = layer.getLatLng(); // Centro del círculo
      } else if (layer instanceof L.Polygon || layer instanceof L.Polyline) {
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

      console.log('Figura dibujada:', { tipo, coordenadas });
    });
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
    if (Object.keys(this.geoJsonLayers).length > 0) {
      this.activarHerramientasDibujo();
    } else {
      console.log('No hay capas activas, herramientas de dibujo desactivadas.');
      if (this.drawControl) {
        this.map.removeControl(this.drawControl);
      }
    }
  }

  // Alternar la carga de capas GeoJSON
  alternarCapaGeo(capaJson: string): void {
    if (this.geoJsonLayers[capaJson]) {
      this.eliminarCapa(capaJson);
      this.selectedLayer = null;
    } else {
      const geoJsonUrl = `${capaJson}`;
      this.cargarCapa(capaJson, geoJsonUrl);
      this.selectedLayer = capaJson;
    }
  }

  // Cargar y agregar una capa GeoJSON con evento hover
  private cargarCapa(layerName: string, geoJsonUrl: string): void {
    this.http.get(geoJsonUrl).subscribe({
      next: (geoJsonData: any) => {
        const layer = L.geoJSON(geoJsonData, {
          style: (feature) => this.obtenerEstilo(feature),
          pointToLayer: (feature, latlng) =>
            this.crearMarcador(feature, latlng),
        });

        //Evento cuando el mouse entra a la capa
        layer.on('mouseover', (event) => {
          const nombre = layerName.toUpperCase();
          const cantidad = geoJsonData.features.length;

          const popupContent = `<b>Capa:</b> ${nombre}<br><b>Elementos:</b> ${cantidad}`;
          const popup = L.popup()
            .setLatLng(event.latlng)
            .setContent(popupContent)
            .openOn(this.map);

          // Guardar el popup para cerrarlo al salir
          (event.target as any)._popup = popup;
        });

        // Evento cuando el mouse sale de la capa
        layer.on('mouseout', (event) => {
          this.map.closePopup(); // Cierra el popup cuando el mouse sale

        });

        this.geoJsonLayers[layerName] = layer;
        layer.addTo(this.map);

        // Actualizar herramientas de dibujo si hay capas activas
        this.verificarCapasYActualizar();
        console.log('se cargo la capa');
      },
      error: (err) =>
        console.error(`Error cargando la capa ${layerName}:`, err),
    });
  }

  // Obtener nombres de capas activas
  listarCapasSeleccionadas(): string[] {
    return Object.keys(this.geoJsonLayers);
  }

  // Crear un marcador con detalles según el nivel de zoom
  private crearMarcador(feature: any, latlng: L.LatLng): L.Layer {
    const marker = L.circleMarker(latlng, { radius: 6, color: 'green' });
    this.actualizarPopup(feature, marker);
    return marker;
  }

  // Establecer estilo de las capas según el tipo de geometría
  private obtenerEstilo(feature: any): L.PathOptions {
    if (!feature || !feature.geometry || !feature.geometry.type) {
      console.warn('Feature inválida:', feature);
      return { color: 'gray', weight: 1 };
    }

    const styles: Record<string, L.PathOptions> = {
      Polygon: { color: 'blue', weight: 2, fillOpacity: 0.4 },
      MultiPolygon: { color: 'blue', weight: 2, fillOpacity: 0.4 },
      LineString: { color: 'red', weight: 2 },
      MultiLineString: { color: 'red', weight: 2 },
      Point: { color: 'green' },
      MultiPoint: { color: 'green' },
    };

    return styles[feature.geometry.type] || { color: 'black', weight: 2 };
  }

  // Actualizar los detalles de los puntos según el nivel de zoom
  private actualizarDetallesSegunZoom(): void {
    if (!this.selectedLayer || !this.geoJsonLayers[this.selectedLayer]) {
      return;
    }

    const selectedLayer = this.geoJsonLayers[this.selectedLayer];

    selectedLayer.eachLayer((layer) => {
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

  // Eliminar una capa específica
  eliminarCapa(layerName: string): void {
    if (this.geoJsonLayers[layerName]) {
      this.map.removeLayer(this.geoJsonLayers[layerName]);
      delete this.geoJsonLayers[layerName];
    }

    // Si no hay capas activas, eliminar todas las figuras dibujadas
    if (this.listarCapasSeleccionadas().length === 0) {
      this.drawnItems.clearLayers();
      // Actualizar herramientas de dibujo si ya no hay capas activas
      this.verificarCapasYActualizar();
    }
  }

  funItem() {
    this.items = [
      {
        key: '0',
        label: 'Users',
        icon: 'pi pi-users',
        items: [
          {
            key: '0_1',
            label: 'New',
            items: [
              {
                key: '0_1_0',
                label: 'Member',
                routerLink: ['/users/new/member'],
              },
              {
                key: '0_1_1',
                label: 'Group',
                routerLink: ['/users/new/group'],
              },
              {
                key: '0_1_2',
                label: 'Group1',
                routerLink: ['/users/new/group1'],
              },
            ],
          },
          {
            key: '0_2',
            label: 'Search',
            routerLink: ['/users/search'],
          },
        ],
      },
      {
        key: '1',
        label: 'Tasks',
        icon: 'pi pi-server',
        items: [
          {
            key: '1_0',
            label: 'Add New',
            routerLink: ['/tasks/add'],
          },
          {
            key: '1_1',
            label: 'Pending',
            routerLink: ['/tasks/pending'],
          },
          {
            key: '1_2',
            label: 'Overdue',
            routerLink: ['/tasks/overdue'],
          },
        ],
      },
      {
        key: '2',
        label: 'Calendar',
        icon: 'pi pi-calendar',
        items: [
          {
            key: '2_0',
            label: 'New Event',
            routerLink: ['/calendar/new'],
          },
          {
            key: '2_1',
            label: 'Today',
            routerLink: ['/calendar/today'],
          },
          {
            key: '2_2',
            label: 'This Week',
            routerLink: ['/calendar/week'],
          },
        ],
      },
    ];
  }


  toggleAll() {
    const expanded = !this.areAllItemsExpanded();
    this.items = this.toggleAllRecursive(this.items, expanded);
  }

  private toggleAllRecursive(items: MenuItem[], expanded: boolean): MenuItem[] {
    return items.map((menuItem) => {
      menuItem.expanded = expanded;
      if (menuItem.items) {
        menuItem.items = this.toggleAllRecursive(menuItem.items, expanded);
      }
      return menuItem;
    });
  }

  private areAllItemsExpanded(): boolean {
    return this.items.every((menuItem) => menuItem.expanded);
  }

  selectCard(num:any){
    this.selectedCard = num;
  }
}
