import { Component, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import * as L from 'leaflet';
import 'leaflet.markercluster';
import 'leaflet-draw';
import 'lodash';

import { PanelMenuModule } from 'primeng/panelmenu';
import { ButtonModule } from 'primeng/button';
import { MegaMenuModule } from 'primeng/megamenu';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { HeaderComponent } from '../componentes/header/header.component';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { MapaService } from '../servicios/mapa.service';
import { CardModule } from 'primeng/card';
import { SliderModule } from 'primeng/slider';
import { PanelModule } from 'primeng/panel';
import { DataViewModule } from 'primeng/dataview';
import { environment } from '../../../environments/environment';

//esto es del pdf
/*import pdfMake from 'pdfmake/build/pdfmake';
import pdfFonts from 'pdfmake/build/vfs_fonts';

(pdfMake as any).vfs = pdfFonts.pdfMake.vfs;*/

@Component({
  selector: 'app-mapa-prueba',
  imports: [
    PanelMenuModule,
    ButtonModule,
    MegaMenuModule,
    TooltipModule,
    AccordionModule,
    HeaderComponent,
    ScrollPanelModule,
    CardModule,
    SliderModule,
    PanelModule,
    CommonModule,
    DataViewModule
  ],
  templateUrl: './mapa-prueba.component.html',
  styleUrl: './mapa-prueba.component.scss',
})
export class MapaPruebaComponent implements OnInit {
  map!: L.Map;

  botonMapa: string = environment.botonCapa;

  items = [
    {
      label: 'Información Estadistica',
      icon: 'pi-database',
      sw: 1,
      escape: false,
    },
    { label: 'Capas Geográficas', icon: 'pi-list', sw: 2, escape: false },
    { label: 'Capas Seleccionadas', icon: 'pi-map', sw: 3, escape: false },
  ];

  activeItem: any | undefined;
  indice: any;
  completo: any;
  private drawnItems!: L.FeatureGroup;
  private drawControl!: L.Control | any;
  private selectedLayer: null = null; // Capa seleccionada

  sw: string = '';
  display: boolean = false;
  colSize: string = 'col-md-9';
  private currentZoom!: number; // Nivel de zoom actual
  markers = L.markerClusterGroup();

  //para el pdf
  url: any;

  //aqui es donde se almacena las capas
  namedGeoJSONLayers: any[] = [];

  layerGroup: L.LayerGroup = L.layerGroup();

  //injectamos el servicio
  servicioMapa = inject(MapaService);

  ngOnInit() {
    this.activeItem = this.items;

    this.servicioMapa.indice().subscribe((resp: any) => {
      this.indice = resp;
      this.completo = JSON.parse(JSON.stringify(this.indice));
      this.indice = this.completo.filter((res: any) => res.sw == 1);
      console.log(resp);
      console.log(this.indice);
    });
  }

  //Configura el mapa de Leaflet, añade capas y controles de dibujo. También maneja eventos de dibujo (creación, edición, eliminación de formas).
  ngAfterViewInit() {
    this.map = L.map('map', {
      center: [-16.5205316, -68.2064783],
      zoom: 6,
      minZoom: 2,
      maxZoom: 18,
    });

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© OpenStreetMap contributors',
    }).addTo(this.map);

    this.drawnItems = new L.FeatureGroup().addTo(this.map);

    this.map.addLayer(this.drawnItems);

    // Verifica si hay capas activas antes de agregar herramientas de dibujo
    this.activarHerramientasDibujo();

    // Detectar cambios en el zoom y actualizar detalles
    this.map.on('zoomend', () => {
      this.currentZoom = this.map.getZoom();
      console.log('Zoom actual:', this.currentZoom);
      this.actualizarDetallesSegunZoom();
    });

    // Escuchar cambios en las capas
    this.map.on('overlayadd', () => this.verificarCapasYActualizar());
    this.map.on('overlayremove', () => this.verificarCapasYActualizar());

    this.map.on((L as any).Draw.Event.CREATED, (e: any) => {
      let tipo = '';
      const layer = e.layer;
      this.drawnItems.addLayer(layer); // Agregar la figura al mapa
      console.log('Para adicionar' + this.namedGeoJSONLayers[0].nombre, layer.toGeoJSON().geometry);

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
      layer.bindPopup(`<b>Tipo:</b> ${tipo}<br><b>Coordenadas:</b> ${JSON.stringify(coordenadas)}`,).openPopup();

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
      }
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
    } else {
      console.log('No hay capas activas, herramientas de dibujo desactivadas.');
      if (this.drawControl) {
        this.map.removeControl(this.drawControl);
      }
    }
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
    console.log(nombre+'  '+e);
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
  opcion(data: any){
    console.log(data);
    this.servicioMapa.buscar(data.opcion).subscribe((resp: any)=>{
      this.capa(resp[0])
    })
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
        const valor = this.namedGeoJSONLayers.find((res: any) => res.nombre == data.nombre_tabla);

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
      geojsonLayer: this.markers
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

  //Genera un PDF con los datos proporcionados.
  /*planilla(data: string,ficha:string){
    console.log(data)
    console.log(ficha)

    this.servicioMapa.ficha_censal_disperso(data).subscribe((resp: any)=>{
      console.log(resp)

    const styleTabla =  {
      hLineWidth: () => 0.5, // Ancho de las líneas horizontales
      vLineWidth: () => 0.5, // Ancho de las líneas verticales
      hLineColor: () => 'black', // Color de las líneas horizontales
      vLineColor: () => 'black', // Color de las líneas verticales
      paddingLeft: () => 5, // Espacio a la izquierda de la celda
      paddingRight: () => 5, // Espacio a la derecha de la celda
      paddingTop: () => 3, // Espacio superior
      paddingBottom: () => 3, // Espacio inferior
    }
    const docDefinition = {
      pageSize: 'LETTER',
      pageOrientation: 'portrait',
      pageMargins: [50, 50, 50, 50],
      content: [
          { text: 'Ficha Resúmen Censo Población y Vivienda 2012', style: 'header' },
          { text: 'DEPARTAMENTO ESTADÍSTICO', style: 'subheader' },
          { text: 'PROVINCIA ESTADÍSTICA', style: 'subheader' },
          { text: 'MUNICIPIO ESTADÍSTICO', style: 'subheader' },
          { columns: [
            {
              width: '*',
              stack: [
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'POBLACIÓN EMPADRONADA POR SEXO, SEGÚN GRUPO DE EDAD', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Grupo de edad', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: resp[0].pob_edad_tot, style: 'tableCol' }, { text: resp[0].pob_edad_toth, style: 'tableCol' }, { text: resp[0].pob_edad_totm, style: 'tableCol' }],
                  [{ text: '0 - 3', style: 'tableCol' }, { text: resp[0].pob_edad_0003, style: 'tableCol' }, { text: resp[0].pob_edad_0003h, style: 'tableCol' }, { text: resp[0].pob_edad_0003m, style: 'tableCol' }],
                  [{ text: '4 - 5', style: 'tableCol' }, { text: resp[0].pob_edad_0405, style: 'tableCol' }, { text: resp[0].pob_edad_0405h, style: 'tableCol' }, { text: resp[0].pob_edad_0405m, style: 'tableCol' }],
                  [{ text: '6 - 19', style: 'tableCol' }, { text: resp[0].pob_edad_0619, style: 'tableCol' }, { text: resp[0].pob_edad_0619h, style: 'tableCol' }, { text: resp[0].pob_edad_0619m, style: 'tableCol' }],
                  [{ text: '20 - 39', style: 'tableCol' }, { text: resp[0].pob_edad_2039, style: 'tableCol' }, { text: resp[0].pob_edad_2039h, style: 'tableCol' }, { text: resp[0].pob_edad_2039m, style: 'tableCol' }],
                  [{ text: '40 - 59', style: 'tableCol' }, { text: resp[0].pob_edad_4059, style: 'tableCol' }, { text: resp[0].pob_edad_4059h, style: 'tableCol' }, { text: resp[0].pob_edad_4059m, style: 'tableCol' }],
                  [{ text: '60 y mas', style: 'tableCol' }, { text: resp[0].pob_edad_60mas, style: 'tableCol' }, { text: resp[0].pob_edad_60mash, style: 'tableCol' }, { text: resp[0].pob_edad_60masm, style: 'tableCol' }],
                  [{ text: 'Población de 18 años y más\n(población en edad de Votar)', style: 'tableCol' }, { text: resp[0].pob_total18amast, style: 'tableCol' }, { text: resp[0].pob_total18amash, style: 'tableCol' }, { text: resp[0].pob_total18amasm, style: 'tableCol' }],
                  [{ text: 'Población femenina de 15 a 49 años edad fértil)', style: 'tableCol' }, { text: resp[0].pob_m1549t, style: 'tableCol' }, '', ''],
                  [{ text: 'Población en viviendas particulares', style: 'tableCol' }, { text: resp[0].pob_vivpartt, style: 'tableCol' }, { text: resp[0].pob_vivparth, style: 'tableCol' }, { text: resp[0].pob_vivpartm, style: 'tableCol' }],
                  [{ text: 'Población en viviendas colectivas', style: 'tableCol' }, { text: resp[0].pob_vivcolectt, style: 'tableCol' }, { text: resp[0].pob_vivcolecth, style: 'tableCol' }, { text: resp[0].pob_vivcolectm, style: 'tableCol' }],
                  [{ text: 'Población sin vivienda en tránsito', style: 'tableCol' }, { text: resp[0].pob_vivctranst, style: 'tableCol' }, { text: resp[0].pob_vivctransth, style: 'tableCol' }, { text: resp[0].pob_vivctranstm, style: 'tableCol' }],
                  [{ text: 'Población sin vivienda  que vive en la calle', style: 'tableCol' }, { text: resp[0].pob_vivcallet, style: 'tableCol' }, { text: resp[0].pob_vivcalleh, style: 'tableCol' }, { text: resp[0].pob_vivcallem, style: 'tableCol' }],
                  [{ text: 'Población empadronada inscrita en el Registro Cívico', style: 'tableCol' }, { text: resp[0].pob_inscregcivt, style: 'tableCol' }, { text: resp[0].pob_inscregcivh, style: 'tableCol' }, { text: resp[0].pob_inscregcivm, style: 'tableCol' }],
                  [{ text: 'Población empadronada que tiene Cédula de Identidad', style: 'tableCol' }, { text: resp[0].pob_tienecarnett, style: 'tableCol' }, { text: resp[0].pob_tienecarneth, style: 'tableCol' }, { text: resp[0].pob_tienecarnetm, style: 'tableCol' }],
                ]},
                layout: styleTabla,
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'POBLACIÓN EMPADRONADA POR SEXO, SEGÚN IDIOMA EN EL QUE APRENDIÓ A HABLAR(1)', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Idioma', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: resp[0].idioma_ninez_ttotal, style: 'tableCol' }, { text: resp[0].idioma_ninez_ttotalh, style: 'tableCol' }, { text: resp[0].idioma_ninez_ttotalm, style: 'tableCol' }],
                  [{ text: 'Castellano', style: 'tableCol' }, { text: resp[0].idioma_ninez_tcastellano, style: 'tableCol' }, { text: resp[0].idioma_ninez_tcastellanoh, style: 'tableCol' }, { text: resp[0].idioma_ninez_tcastellanom, style: 'tableCol' }],
                  [{ text: 'Quechua', style: 'tableCol' }, { text: resp[0].idioma_ninez_tquechua, style: 'tableCol' }, { text: resp[0].idioma_ninez_hquechua, style: 'tableCol' }, { text: resp[0].idioma_ninez_mquechua, style: 'tableCol' }],
                  [{ text: 'Aymara', style: 'tableCol' }, { text: resp[0].idioma_ninez_taymara, style: 'tableCol' }, { text: resp[0].idioma_ninez_haymarah, style: 'tableCol' }, { text: resp[0].idioma_ninez_maymaram, style: 'tableCol' }],
                  [{ text: 'Guaraní', style: 'tableCol' }, { text: resp[0].idioma_ninez_tguarani, style: 'tableCol' }, { text: resp[0].idioma_ninez_hguarani, style: 'tableCol' }, { text: resp[0].idioma_ninez_mguarani, style: 'tableCol' }],
                  [{ text: 'Otros idiomas oficiales', style: 'tableCol' }, { text: resp[0].idioma_ninez_toficiales, style: 'tableCol' }, { text: resp[0].idioma_ninez_hoficiales, style: 'tableCol' }, { text: resp[0].idioma_ninez_moficiales, style: 'tableCol' }],
                  [{ text: 'Otros idiomas', style: 'tableCol' }, { text: resp[0].idioma_ninez_totros, style: 'tableCol' }, { text: resp[0].idioma_ninez_hotrosh, style: 'tableCol' }, { text: resp[0].idioma_ninez_motrosm, style: 'tableCol' }],
                  [{ text: 'Idioma extranjero', style: 'tableCol' }, { text: resp[0].idioma_ninez_textranjero, style: 'tableCol' }, { text: resp[0].idioma_ninez_hextranjero, style: 'tableCol' }, { text: resp[0].idioma_ninez_mextranjero, style: 'tableCol' }],
                  [{ text: 'No habla', style: 'tableCol' }, { text: resp[0].idioma_ninez_tnohabla, style: 'tableCol' }, { text: resp[0].idioma_ninez_hnohablah, style: 'tableCol' }, { text: resp[0].idioma_ninez_mnohablam, style: 'tableCol' }],
                  [{ text: 'Sin especificar', style: 'tableCol' }, { text: resp[0].idioma_ninez_tsinespecificar, style: 'tableCol' }, { text: resp[0].idioma_ninez_hsinespecificarh, style: 'tableCol' }, { text: resp[0].idioma_ninez_msinespecificarm, style: 'tableCol' }],
                ]},
                layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'POBLACIÓN EMPADRONADA DE 6 A 19 AÑOS POR SEXO, SEGÚN ASISTENCIA ESCOLAR(1)', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Asistencia escolar', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: resp[0].asist_escolart, style: 'tableCol' }, { text: resp[0].asist_escolarh, style: 'tableCol' }, { text: resp[0].asist_escolarm, style: 'tableCol' }],
                  [{ text: 'Asiste', style: 'tableCol' }, { text: resp[0].asist_asistet, style: 'tableCol' }, { text: resp[0].asist_asisteh, style: 'tableCol' }, { text: resp[0].asist_asistem, style: 'tableCol' }],
                  [{ text: 'No Asiste', style: 'tableCol' }, { text: resp[0].asist_noasistet, style: 'tableCol' }, { text: resp[0].asist_noasisteh, style: 'tableCol' }, { text: resp[0].asist_noasistem, style: 'tableCol' }],
                  [{ text: 'Sin especificar', style: 'tableCol' }, { text: resp[0].asist_sinespecificart, style: 'tableCol' }, { text: resp[0].asist_sinespecificarh, style: 'tableCol' }, { text: resp[0].asist_sinespecificarm, style: 'tableCol' }],
                ]},
                layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 80] },
              { table: {
                widths: [100, '*'],
                body: [
                  [{ text: 'VIVIENDA', colSpan: 2, style: 'tableHeader' }, ''],
                  [{ text: 'Vivienda', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: '0', style: 'tableCol' }],
                  [{ text: 'Número de viviendas particulares', style: 'tableCol' }, { text: resp[0].viv_vivpart, style: 'tableCol' }],
                  [{ text: 'Número de viviendas colectivas', style: 'tableCol' }, { text: resp[0].viv_vivcolec, style: 'tableCol' }],
                  [{ text: 'Disponibilidad de energía eléctrica', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: '0', style: 'tableCol' }],
                  [{ text: 'Red de empresa eléctrica', style: 'tableCol' }, { text: resp[0].viv_sb_enrg_red, style: 'tableCol' }],
                  [{ text: 'Otra fuente', style: 'tableCol' }, { text: resp[0].viv_sb_enrg_otrfuente, style: 'tableCol' }],
                  [{ text: 'No tiene', style: 'tableCol' }, { text: resp[0].viv_sb_enrg_notiene, style: 'tableCol' }],
                  [{ text: 'Combustible o energía más utilizado para cocinar', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' },{ text: '0', style: 'tableCol' }],
                  [{ text: 'Gas en garrafa', style: 'tableCol' }, { text: resp[0].viv_sb_comb_gasgarraf, style: 'tableCol' }],
                  [{ text: 'Gas por cañería', style: 'tableCol' }, { text: resp[0].viv_sb_comb_caneria, style: 'tableCol' }],
                  [{ text: 'Leña', style: 'tableCol' }, { text: resp[0].viv_sb_comb_lenia, style: 'tableCol' }],
                  [{ text: 'Otros (electricidad, energía solar )', style: 'tableCol' }, { text: resp[0].viv_sb_comb_otros, style: 'tableCol' }],
                  [{ text: 'Procedencia del agua que utilizan en la vivienda', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, { text: '0', style: 'tableCol' }],
                  [{ text: 'Cañeria de red', style: 'tableCol' }, { text: resp[0].viv_sb_agua_red, style: 'tableCol' }],
                  [{ text: 'Pileta pública', style: 'tableCol' }, { text: resp[0].viv_sb_agua_ppublica, style: 'tableCol' }],
                  [{ text: 'Carro repartidor', style: 'tableCol' }, { text: resp[0].viv_sb_agua_carro, style: 'tableCol' }],
                  [{ text: 'Pozo o noria', style: 'tableCol' }, { text: resp[0].viv_sb_agua_pozo, style: 'tableCol' }],
                  [{ text: 'Lluvia, río, vertiente, acequía', style: 'tableCol' }, { text: resp[0].viv_sb_agua_lluvia, style: 'tableCol' }],
                  [{ text: 'Otro (aguatero, lago, laguna/acequía)', style: 'tableCol' },  { text: resp[0].viv_sb_agua_otros, style: 'tableCol' }],
                ]},
                layout: styleTabla
              }]
            },
            {
              width: '*',
              stack: [
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'LUGAR DONDE ACUDE LA POBLACIÓN CUANDO TIENEN PROBLEMAS DE SALUD', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Salud', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Caja de Salud (CNS, COSSMIL, u otras)', style: 'tableCol' }, { text: resp[0].salud_cajat, style: 'tableCol' }, { text: resp[0].salud_cajah, style: 'tableCol' },  { text: resp[0].salud_cajam, style: 'tableCol' }],
                  [{ text: 'Seguro de salud privado', style: 'tableCol' }, { text: resp[0].salud_seguro_privadot, style: 'tableCol' }, { text: resp[0].salud_seguro_privadoh, style: 'tableCol' }, { text: resp[0].salud_seguro_privadom, style: 'tableCol' }],
                  [{ text: 'Establecimientos de salud público', style: 'tableCol' }, { text: resp[0].salud_publicot, style: 'tableCol' }, { text: resp[0].salud_publicoh, style: 'tableCol' }, { text: resp[0].salud_publicom, style: 'tableCol' }],
                  [{ text: 'Establecimientos de salud privado', style: 'tableCol' }, { text: resp[0].salud_privadot, style: 'tableCol' }, { text: resp[0].salud_privadoh, style: 'tableCol' }, { text: resp[0].salud_privadom, style: 'tableCol' }],
                  [{ text: 'Médico tradicional', style: 'tableCol' }, { text: resp[0].salud_medio_tradicionalt, style: 'tableCol' },  { text: resp[0].salud_medio_tradicionalh, style: 'tableCol' },  { text: resp[0].salud_medio_tradicionalm, style: 'tableCol' }],
                  [{ text: 'Soluciones caseras', style: 'tableCol' }, { text: resp[0].salud_solcaserast, style: 'tableCol' },  { text: resp[0].salud_solcaserash, style: 'tableCol' },  { text: resp[0].salud_solcaserasm, style: 'tableCol' }],
                  [{ text: 'La farmacia o se automedica', style: 'tableCol' }, { text: resp[0].salud_faramaciat, style: 'tableCol' },  { text: resp[0].salud_faramaciah, style: 'tableCol' },  { text: resp[0].salud_faramaciam, style: 'tableCol' }],
                ]
              },
              layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'POBLACIÓN EMPADRONADA, POR SEXO, SEGÚN LUGAR DE NACIMIENTO Y RESIDENCIA HABITUAL', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Lugar de nacimiento', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, resp[0].lugar_nacimientot, resp[0].lugar_nacimientoh, resp[0].lugar_nacimientom],
                    [{ text: 'Aquí', style: 'tableCol' }, resp[0].lugar_nacimiento_aquit, resp[0].lugar_nacimiento_aquih, resp[0].lugar_nacimiento_aquim],
                    [{ text: 'En otro lugar del país', style: 'tableCol' }, resp[0].lugar_nacimiento_otrolugart, resp[0].lugar_nacimiento_otrolugarh, resp[0].lugar_nacimiento_otrolugarm],
                    [{ text: 'En el exterior', style: 'tableCol' }, resp[0].lugar_nacimiento_exteriort, resp[0].lugar_nacimiento_exteriorh, resp[0].lugar_nacimiento_exteriorm],
                    [{ text: 'Lugar de residencia habitual', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                    [{ text: 'Total', style: 'tableCol' }, resp[0].lugar_recidenciat, resp[0].lugar_recidenciah, resp[0].lugar_recidenciam],
                    [{ text: 'Aquí', style: 'tableCol' }, resp[0].lugar_recidencia_aquit, resp[0].lugar_recidencia_aquih, resp[0].lugar_recidencia_aquim],
                    [{ text: 'En otro lugar del país', style: 'tableCol' }, resp[0].lugar_recidencia_otrolugart, resp[0].lugar_recidencia_otrolugarh, resp[0].lugar_recidencia_otrolugarm],
                    [{ text: 'En el exterior', style: 'tableCol' }, resp[0].lugar_recidencia_exteriort, resp[0].lugar_recidencia_exteriorh, resp[0].lugar_recidencia_exteriorm],
                ]
              },
              layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*', '*', '*'],
                body: [
                  [{ text: 'POBLACIÓN EMPADRONADA DE 10 AÑOS O MÁS DE EDAD, SEGÚN ACTIVIDAD ECONÓMICA Y CATEGORIA OCUPACIONAL(1)', colSpan: 4, style: 'tableHeader' }, '', '', ''],
                  [{ text: 'Sector económico', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, resp[0].actividad_total, resp[0].actividad_totalh, resp[0].actividad_totalm],
                    [{ text: 'Agricultura, ganadería, caza,pesca y sivicultura', style: 'tableCol' }, resp[0].actividad_agricultura, resp[0].actividad_agriculturah, resp[0].actividad_agriculturam],
                    [{ text: 'Minería e Hidrocarburos', style: 'tableCol' }, resp[0].actividad_mineria, resp[0].actividad_mineriah, resp[0].actividad_mineriam],
                    [{ text: 'Industria manufacturera', style: 'tableCol' }, resp[0].actividad_industria, resp[0].actividad_industriah, resp[0].actividad_industriam],
                    [{ text: 'Electricidad, gas, agua y desechos', style: 'tableCol' }, resp[0].actividad_electricidad, resp[0].actividad_electricidadh, resp[0].actividad_electricidadm],
                    [{ text: 'Construcción', style: 'tableCol' }, resp[0].actividad_construccion, resp[0].actividad_construccionh, resp[0].actividad_construccionm],
                    [{ text: 'Comercio, transporte y almacenes', style: 'tableCol' }, resp[0].actividad_comercio, resp[0].actividad_comercioh, resp[0].actividad_comerciom],
                    [{ text: 'Otros servicios', style: 'tableCol' }, resp[0].actividad_otrosservicios, resp[0].actividad_otrosserviciosh, resp[0].actividad_otrosserviciosm],
                    [{ text: 'Sin especificar', style: 'tableCol' }, resp[0].actividad_sinespecificar, resp[0].actividad_sinespecificarh, resp[0].actividad_sinespecificarm],
                    [{ text: 'Descripciones incompletas', style: 'tableCol' }, resp[0].actividad_descripsionincompleta, resp[0].actividad_descripsionincompletah, resp[0].actividad_descripsionincompletam],
                  [{ text: 'Categoría ocupacional', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }, { text: 'Hombres', style: 'tableSub' }, { text: 'Mujeres', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, resp[0].ocupacional_totalt, resp[0].ocupacional_totalh, resp[0].ocupacional_totalm],
                    [{ text: 'Obrera/o o empleada/o', style: 'tableCol' }, resp[0].ocupacional_obrerot, resp[0].ocupacional_obreroh, resp[0].ocupacional_obrerom],
                    [{ text: 'Trabajadora/or del hogar', style: 'tableCol' }, resp[0].ocupacional_hogart, resp[0].ocupacional_hogarh, resp[0].ocupacional_hogarm],
                    [{ text: 'Trabajadora/or por cuenta propia', style: 'tableCol' }, resp[0].ocupacional_cuentapropiat, resp[0].ocupacional_cuentapropiah, resp[0].ocupacional_cuentapropiam],
                    [{ text: 'Empleadora/or o socia/o', style: 'tableCol' }, resp[0].ocupacional_sociot, resp[0].ocupacional_socioh, resp[0].ocupacional_sociom],
                    [{ text: 'Trabajadora/or familiar o aprendiz sin renumeración', style: 'tableCol' }, resp[0].ocupacional_familiart, resp[0].ocupacional_familiarh, resp[0].ocupacional_familiarm],
                    [{ text: 'Cooperativa de producción/servicios', style: 'tableCol' }, resp[0].ocupacional_cooperativistat, resp[0].ocupacional_cooperativistah, resp[0].ocupacional_cooperativistam],
                    [{ text: 'Sin especificar', style: 'tableCol' }, resp[0].ocupacional_sinespecificart, resp[0].ocupacional_sinespecificarh, resp[0].ocupacional_sinespecificarm],
                ]
              },
              layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*'],
                body: [
                  [{ text: 'Desague del servicio sanitario', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, '0' ],
                  [{ text: 'Al alcantarillado', style: 'tableCol' }, resp[0].viv_sb_desgu_alcant ],
                    [{ text: 'A una cámara séptica', style: 'tableCol' }, resp[0].viv_sb_desgu_camsept ],
                    [{ text: 'A un pozo ciego', style: 'tableCol' }, resp[0].viv_sb_desgu_pozociego ],
                    [{ text: 'A la calle', style: 'tableCol' }, resp[0].viv_sb_desgu_calle ],
                    [{ text: 'A la quebrada, río', style: 'tableCol' }, resp[0].viv_sb_desgu_quebrada ],
                    [{ text: 'A un lago, laguna, curichi', style: 'tableCol' }, resp[0].viv_sb_desgu_lago ],
                ]},
                layout: styleTabla
              },
              { text: '', margin: [0, 0, 0, 5] },
              { table: {
                widths: [100, '*'],
                body: [
                  [{ text: 'Eliminación de la basura', style: 'tableSub' }, { text: 'Total', style: 'tableSub' }],
                  [{ text: 'Total', style: 'tableCol' }, '0' ],
                  [{ text: 'La depositan en basurero público o contenedor', style: 'tableCol' }, resp[0].viv_basura_contened ],
                    [{ text: 'Servicio público de recolección (carro basurero)', style: 'tableCol' }, resp[0].viv_basura_carro ],
                    [{ text: 'La botan a un terreno baldío o en la calle', style: 'tableCol' }, resp[0].viv_basura_baldio ],
                    [{ text: 'La botan al río', style: 'tableCol' }, resp[0].viv_basura_rio ],
                    [{ text: 'La queman', style: 'tableCol' }, resp[0].viv_basura_queman ],
                    [{ text: 'La entierran', style: 'tableCol' }, resp[0].viv_basura_entierran ],
                    [{ text: 'Otra forma', style: 'tableCol' }, resp[0].viv_basura_otros ],
                ]},
                layout: styleTabla
              }]
            }
            ],
            columnGap: 10
          },
      ],
      defaultStyle: { font: 'Roboto' },
      styles: {
        header: { fontSize: 10, bold: true, alignment: 'center', margin: [0, 0, 0, 10]  },
        subheader: { fontSize: 9, bold: false, margin: [0, 0, 0, 10]  },
        tableHeader: { fontSize: 8, alignment: 'center', color: 'white', fillColor: '#4e869d' },
        tableSub: { fontSize: 7, alignment: 'center', color: 'white', fillColor: '#4e869d' },
        tableCol: { fontSize: 7, color: 'black' },
        defaultStyle: { fontSize: 7 }
      }
    };
    const pdfDocGenerator =(pdfMake as any).createPdf(docDefinition, null,fonts);
    pdfDocGenerator.getBlob((blob: Blob) => {
      this.url = URL.createObjectURL(blob);
      console.log(this.url)
    })
  })
  }*/
}
