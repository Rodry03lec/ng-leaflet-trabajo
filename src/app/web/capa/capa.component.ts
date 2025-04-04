import { Component, OnInit, ViewChild, ElementRef, inject, PLATFORM_ID, ChangeDetectorRef } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { FormsModule } from '@angular/forms';

//aqui importamos todo lo de prime
import {  PrimeNgImports } from './../componentes/imports/imports.web'

//importaciones de Leaftlet
import * as L from 'leaflet';
import 'leaflet.markercluster';  // Importar Leaflet MarkerCluster
import 'leaflet-draw';
import 'lodash';


//importacion de servicios
import { MapaService } from '../servicios/mapa.service';

//importacion de environments
import { environment } from '../../../environments/environment';

// Interfaces
import { elementosMenu }  from './../componentes/interfaces/capa.interface';



interface Punto {
  id: number;
  nombre: string;
  geojson: {
    type: string;
    coordinates: [number, number];
  };
}


@Component({
  selector: 'app-capa',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    //esto es de prime ng
    PrimeNgImports
  ],
  templateUrl: './capa.component.html',
  styleUrls: ['./capa.component.scss'],
})
export class CapaComponent implements OnInit {
  @ViewChild('mapContainer') mapContainer!: ElementRef;

  map!: L.Map;
  panelVisible = true;
  elementoSeleccionado: elementosMenu | null = null;
  private drawControl!: L.Control | any;
  private drawnItems!: L.FeatureGroup;
  markers = L.markerClusterGroup();
  sw: string = '';
  layerGroup: L.LayerGroup = L.layerGroup();

  //injectamos el servicio
  servicioMapa = inject(MapaService);
  botonMapa: string = environment.botonCapa;

  //aqui es donde se almacena las capas
  capasGeoJSONalmacenadas: any[] = [];
  private geoJsonLayer!: L.GeoJSON;

  panelVisible1: any = false;

  valorColor!: number;

  //para los graficos
  datosCard: any;
  optionesCard: any;
  platformId = inject(PLATFORM_ID);

  //para el modal
  visible:boolean = false;

  //para la grafica
  constructor(private cd: ChangeDetectorRef) {}

  //para pruebas
  selectedCountry: string | undefined;

  //tematica
  teamticas:any[] = [];
  selectedIndicador: any = null;

  //para busqueda de departamentos y municipios
  busquedaTexto: string = '';
  busquedaOptenido: any[] = [];

  // Menu items with detailed descriptions
  menuElementos: elementosMenu[] = [
    {
      nombreMenu: 'Temática',
      icon: 'pi-database',
      sw: 1,
      description:'Explora las tematicas correspondientes.',
    },
    {
      nombreMenu: 'Departamentos de Bolivia y Municipios',
      icon: 'pi-list',
      sw: 2,
      description: 'Departamentos',
    },
    {
      nombreMenu: 'Capas Seleccionadas',
      icon: 'pi-map',
      sw: 3,
      description:'Administra, edita y exporta tus capas geográficas personalizadas con total flexibilidad.',
    }
  ];

  //par ala parte de os indicadores
  lista_tematica = [
    { id:1, nombre:'POBLACIÓN',
      indicador:[
        { id: 1, nombre: 'Edad mediana' },
        { id: 2, nombre: 'Tasa global de dependencia' },
        { id: 3, nombre: 'Índice de envejecimiento' },
        { id: 4, nombre: 'Índice de juventud' },
        { id: 5, nombre: 'Índice de masculinidad' },
        { id: 6, nombre: 'Población que reside en áreas urbanas' },
        { id: 7, nombre: 'Población de 15 años o más que vive en unión' },
      ]
    },
    { id:2, nombre:'FECUNDIDAD',
      indicador:[
        { id: 8, nombre: 'Tasa global de fecundidad' },
        { id: 9, nombre: 'Edad media de la madre al primer nacimiento' },
      ]
    },
    { id:3, nombre:'MIGRACIÓN' },
    { id:4, nombre:'MORTALIDAD' },
    { id:5, nombre:'AUTOIDENTIFICACIÓN' },
    { id:6, nombre:'IDIOMAS' },
    { id:7, nombre:'CIUDADANÍA' },
    { id:8, nombre:'SALUD' },
    { id:9, nombre:'DISCAPACIDAD' },
    { id:10, nombre:'EDUCACIÓN' },
    { id:11, nombre:'EMPLEO' },
    { id:12, nombre:'VIVIENDA' },
    { id:13, nombre:'POBREZA' }
  ];

  // Copia inicial
  filtro: string = '';
  lista_tematicaFiltrada:any []= [];

  //selecion de departamentos
  selectedDepartments: any[] = [];

  private coloresDisponibles = ["blue", "green", "red", "orange", "purple", "cyan", "magenta", "brown", "teal"];

  ngOnInit() {
    // Ensure map initialization after view is ready
    setTimeout(() => this.iniciarMapa(), 100);
    setTimeout(()=> this.iniciarChart(), 100);
    this.elementoSeleccionado = this.menuElementos[0];
    this.lista_tematicaFiltrada = [...this.lista_tematica];
  }

  //para iniciar el mapa
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

      // Capa estándar (OpenStreetMap)
      const osmLayer = L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '© OpenStreetMap contributors',
        opacity: 1,
      });

      // Capa de satélite (Esri)
      const esriSatelliteLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}', {
        attribution: 'Tiles &copy; Esri',
        opacity: 1,
      });

      // Capa de relieve de CartoDB Positron
      const cartoDBReliefLayer = L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors, &copy; CartoDB',
        opacity: 1,
      });

      // Capa de relieve (Esri World Terrain)
      const esriWorldTerrainLayer = L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Terrain_Base/MapServer/tile/{z}/{y}/{x}', {
        attribution: '&copy; Esri &copy; OpenStreetMap contributors',
        opacity: 1,
      });

      // Agregar la capa predeterminada (OpenStreetMap)
      osmLayer.addTo(this.map);

      // Inicializar el featureGroup para las figuras dibujadas
      this.drawnItems = new L.FeatureGroup();
      this.map.addLayer(this.drawnItems);

      // Control de zoom
      L.control.zoom({
        position: 'bottomright',
      }).addTo(this.map);

      // Agregar un control de capas para que el usuario cambie entre mapas
      const baseMaps = {
        "Mapa estándar (OSM)": osmLayer,
        "Satélite": esriSatelliteLayer,
        "Carto": cartoDBReliefLayer,
        "Esri": esriWorldTerrainLayer,
      };

      // Control de capas en la esquina inferior izquierda
      L.control.layers(baseMaps, {}, { position: 'bottomright' }).addTo(this.map);

      // Configurar el listener de eventos para figuras creadas
      this.configurarEventosDrawCreated();

      // Verificar si hay capas activas y actualizar herramientas de dibujo
      this.verificarCapasYActualizar();
    }
  }

  // Configurar eventos para figuras creadas
  private configurarEventosDrawCreated(): void {
    this.map.on((L as any).Draw.Event.CREATED, (e: any) => {
      let tipo = '';
      const capa = e.layer;
      // Obtener coordenadas
      let coordenadas: any;
      if (capa) {
        this.drawnItems.addLayer(capa); // Agregar la figura al mapa

        // Determinar el tipo de geometría
        if (capa instanceof L.Circle) tipo = 'Círculo';
        else if (capa instanceof L.Polygon) tipo = 'Polígono';
        else if (capa instanceof L.Rectangle) tipo = 'Rectángulo';
        else if (capa instanceof L.Polyline) tipo = 'Línea';
        else if (capa instanceof L.Marker) tipo = 'Marcador';
        else tipo = 'Desconocido';

        // Obtener coordenadas según el tipo
        if (capa instanceof L.Circle) {
          coordenadas = capa.getLatLng(); // Centro del círculo
          // Modificar estilo
          capa.setStyle({
            color: '#ff0000',
            weight: 4,
            fillColor: '#ffcccc',
            fillOpacity: 0.5
          });
        } else if (capa instanceof L.Polygon || capa instanceof L.Polyline) {
          coordenadas = capa.getLatLngs(); // Lista de coordenadas
          // Modificar estilo
          capa.setStyle({
            color: '#ff0000',
            weight: 4,
            fillColor: '#ffcccc',
            fillOpacity: 0.5
          });
        } else if (capa instanceof L.Marker) {
          coordenadas = capa.getLatLng(); // Punto exacto
          capa.setIcon((L as any).divIcon({ className: 'pi pi-circle' }));
        }

        // Mostrar detalles en un popup
        capa.bindPopup(`<b>Tipo:</b> ${tipo} <br><b>Coordenadas:</b> ${JSON.stringify(coordenadas)}`).openPopup();

        if (this.capasGeoJSONalmacenadas && this.capasGeoJSONalmacenadas.length > 0) {
          console.log('Para adicionar ' + this.capasGeoJSONalmacenadas[0].nombre, capa.toGeoJSON().geometry);
        }

        console.log('Figura dibujada:', { tipo, coordenadas });
      }
    });

    // Añadir evento de edición para capturar cuando se mueven las figuras
    this.map.on((L as any).Draw.Event.EDITED, (e: any) => {
      const layers = e.layers;
      layers.eachLayer((layer: any) => {
        console.log('Capa editada:', layer);
        // Aquí puedes actualizar los datos después de mover
      });
    });
  }

  // Verificar si hay capas activas y actualizar herramientas de dibujo
  private verificarCapasYActualizar(): void {
    if (this.capasGeoJSONalmacenadas && Object.keys(this.capasGeoJSONalmacenadas).length > 0) {
      this.activarHerramientasDibujo();
    } else {
      console.log('No hay capas activas, herramientas de dibujo desactivadas.');
      if (this.drawControl) {
        this.map.removeControl(this.drawControl);
      }
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
        poly: {
          allowIntersection: false
        }
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
  }

  // Función principal para dibujar la geometría según el tipo
  private dibujarGeometria(datos: any) {
    if (!datos || !datos.geojson || !datos.geojson.coordinates) {
      console.error("Error: No hay datos de coordenadas válidos");
      return;
    }

    const coordinates = datos.geojson.coordinates;
    const geometryType = this.obtenerTipoGeometria(coordinates);

    try {
      // Redirigir según el tipo de geometría
      switch (geometryType) {
        case 'Point':
          this.dibujarPunto(datos);
          break;
        case 'Polygon':
          this.dibujarPoligono(datos);
          break;
        case 'MultiPolygon':
          this.dibujarMultiPoligono(datos);
          break;
        default:
          console.error("Tipo de geometría no soportado");
      }
    } catch (error) {
      console.error("Error al procesar el GeoJSON:", error);
    }
  }

  // Determinar el tipo de geometría (Punto, Polígono, MultiPolígono)
  private obtenerTipoGeometria(coordinates: any): string {
    if (coordinates.length > 0 && Array.isArray(coordinates[0][0])) {
      return "MultiPolygon";  // Si la estructura es un MultiPolygon
    }
    if (coordinates.length > 0 && Array.isArray(coordinates[0])) {
      return "Polygon"; // Si la estructura es un Polygon
    }
    if (coordinates.length === 2) {
      return "Point"; // Si las coordenadas corresponden a un Punto
    }
    return "Unknown"; // Si no es reconocido
  }

  // Función para dibujar un punto en el mapa
  private dibujarPunto(datos: any) {
    const coordinates = datos.geojson.coordinates;
    const geoJsonFeature = {
      type: "Feature",
      properties: { nombre: datos.depto },
      geometry: {
        type: "Point",
        coordinates: coordinates
      }
    };

    this.agregarCapaGeoJson(geoJsonFeature);
  }

  // Función para dibujar un polígono en el mapa
  private dibujarPoligono(datos: any) {
    const coordinates = datos.geojson.coordinates;
    const geoJsonFeature = {
      type: "Feature",
      properties: { nombre: datos.depto },
      geometry: {
        type: "Polygon",
        coordinates: coordinates
      }
    };

    this.agregarCapaGeoJson(geoJsonFeature);
  }

  // Función para dibujar un multipolígono en el mapa
  private dibujarMultiPoligono(datos: any) {
    let coordinates = datos.geojson.coordinates;

    if (coordinates.length > 0 && !Array.isArray(coordinates[0][0][0])) {
      coordinates = [coordinates];  // Normalizar a MultiPolygon
    }

    const geoJsonFeature = {
      type: "Feature",
      properties: {
        nombre: datos.nombre,
        id: datos.id
      },
      geometry: {
        type: "MultiPolygon",
        coordinates: coordinates
      }
    };

    this.agregarCapaGeoJson(geoJsonFeature);
  }

  // Función común para agregar cualquier capa GeoJSON al mapa
  private agregarCapaGeoJson(geoJsonFeature: any) {
    const nombreCapa = geoJsonFeature.properties.nombre;
    const capaId = geoJsonFeature.properties.id;


    const yaExiste = this.capasGeoJSONalmacenadas.some(capa =>
      capa.nombre === nombreCapa && capa.id === capaId
    );

    if (yaExiste) {
      console.log(`La capa '${nombreCapa}' con ID '${capaId}' ya está almacenada.`);
      return;
    }

    // Elegir un color basado en la cantidad de capas ya almacenadas (cíclico)
    const colorIndex = this.capasGeoJSONalmacenadas.length % this.coloresDisponibles.length;
    const color = this.coloresDisponibles[colorIndex];

    this.geoJsonLayer = L.geoJSON(geoJsonFeature, {
      style: {
        color: "#170401",
        weight: 2,
        fillColor: color,
        fillOpacity: 0.6,
        opacity: 1
      }
    }).addTo(this.map);

    this.capasGeoJSONalmacenadas.push({ nombre: nombreCapa, id: capaId, geojsonLayer: this.geoJsonLayer, opacidad: 3 });

    this.map.fitBounds(this.geoJsonLayer.getBounds());
    this.verificarCapasYActualizar();
  }


  // Función para eliminar una capa por su nombre
  eliminarCapa(nombre: string) {
    // Buscar la capa por nombre
    const capaIndex = this.capasGeoJSONalmacenadas.findIndex(c => c.nombre === nombre);

    if (capaIndex !== -1) {
        const capa = this.capasGeoJSONalmacenadas[capaIndex];
        // Eliminar la capa del mapa
        if (capa.geojsonLayer) {
            this.map.removeLayer(capa.geojsonLayer);
        }
        // Eliminar la capa del arreglo
        this.capasGeoJSONalmacenadas.splice(capaIndex, 1);
        // Actualizar el estado de las capas en el mapa
        this.verificarCapasYActualizar();
    } else {
        console.log(`No se encontró la capa con nombre: ${nombre}`);
    }
  }

  // Para cambiar la opacidad
  cambiarOpacidad(nombre: string, e: any) {
    if (!e || e.value === undefined) {
      return;
    }
    const nuevaOpacidad = +e.value;
    if (isNaN(nuevaOpacidad)) {
      return;
    }
    // Buscar la capa
    const capa = this.capasGeoJSONalmacenadas.find((res: any) => res.nombre === nombre);
    if (!capa) {
      return;
    }
    // Verificar que 'geojsonLayer' está definido
    if (!capa.geojsonLayer) {
      return;
    }
    // Actualizar la opacidad en la capa almacenada
    capa.opacidad = nuevaOpacidad;
    // Aplicar nueva opacidad
    capa.geojsonLayer.setStyle({
      opacity: nuevaOpacidad / 3,
      fillOpacity: nuevaOpacidad / 3,
    });
  }

  //para filtrar los indicadores
  filtrarIndicadores() {
    const filtroLower = this.filtro.toLowerCase().trim();

    this.lista_tematicaFiltrada = this.lista_tematica.map(tema => ({
      ...tema,
      indicador: tema.indicador
        ? tema.indicador.filter(indicador => indicador.nombre.toLowerCase().includes(filtroLower))
        : []
    })).filter(tema => tema.indicador.length > 0 || tema.nombre.toLowerCase().includes(filtroLower));
  }

  //para la seleccionar indiciador
  selectIndicador(indicador: any) {
    this.selectedIndicador = indicador;
  }

  //para la parte del menu
  alternarPanel() {
    this.panelVisible = !this.panelVisible;
    if (!this.panelVisible) {
      this.elementoSeleccionado = null;
    }
  }

  //Cambia el ítem activo y filtra los datos correspondientes.
  evento(item: any) {
    this.elementoSeleccionado = item;
  }

  //para la parte de los graficos
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

  //para mostrar el modal
  mostrarModal(){
    this.visible = true;
  }

  buscarDepaMun(nombre: string) {
    if (nombre.length >= 3) {
      this.servicioMapa.busquedaDepMun({ nombre }).subscribe(
        (resp: any) => {
          console.log("Respuesta del servidor:", resp);
          this.busquedaOptenido = resp;
        },
        (error) => {
          console.error("Ocurrió un error:", error);
        }
      );
    } else {
      this.busquedaOptenido = [];
    }
  }

  //para realizar el proceso de seleccion de municipio o departamento
  seleccionarDepMunicipio(id: any, tipo: any) {
    console.log(id + tipo);
    this.servicioMapa.deparMunicipioVer(id, tipo).subscribe(
      (resp: any) => {
        console.log("Respuesta del servidor:", resp);
        for (let index = 0; index < resp.length; index++) {
          this.dibujarGeometria(resp[index]);
        }
      },
      (error) => {
        console.error("Ocurrió un error:", error);
      }
    );
  }

  //para la parte de las pruebas de los puntoss
  puntosPrueba() {
    this.servicioMapa.pruebaPuntosGet().subscribe(
      (resp: any) => {
        console.log("Respuesta del servidor:", resp);
        this.dibujarPuntosAgrupados(resp, 'nombre', 1);
      },
      (error) => {
        console.error("Ocurrió un error:", error);
      }
    );
  }

  // Para los puntos
  dibujarPuntosAgrupados(datos: any, nombre: any, id: any) {
    // Verificar si la capa ya está almacenada
    const capaExistente = this.capasGeoJSONalmacenadas.find(capa => capa.id === id || capa.nombre === nombre);

    if (capaExistente) {
      console.log("La capa ya está almacenada:", capaExistente);
      // Si la capa ya está almacenada, puedes evitar agregarla de nuevo
      return;
    }
    // Crear un nuevo grupo de marcadores para cada llamada
    const markers = L.markerClusterGroup();
    // Iterar sobre los puntos y añadirlos al grupo de marcadores
    (datos as Punto[]).forEach(punto => {
      const [lng, lat] = punto.geojson.coordinates;
      // Crear un marcador
      const marker = L.marker([lat, lng]).bindPopup(`<strong>${punto.nombre}</strong>`); // Puedes agregar más información en el popup
      // Añadir el marcador al grupo de marcadores
      markers.addLayer(marker);
    });
    // Almacenar la capa con un nombre y un id
    this.capasGeoJSONalmacenadas.push({
      nombre: nombre,
      id: id,
      geojsonLayer: markers,  // Almacenamos el grupo de marcadores
      opacidad: 0.8  // Puedes cambiar la opacidad aquí
    });
    // Añadir el grupo de marcadores al mapa
    this.map.addLayer(markers);
  }

}
