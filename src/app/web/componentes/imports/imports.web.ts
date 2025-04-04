import { NgModule } from '@angular/core';
import { ButtonModule } from 'primeng/button';
import { ScrollPanelModule } from 'primeng/scrollpanel';
import { TooltipModule } from 'primeng/tooltip';
import { AccordionModule } from 'primeng/accordion';
import { CardModule } from 'primeng/card';
import { PanelModule } from 'primeng/panel';
import { SliderModule } from 'primeng/slider';
import { DataViewModule } from 'primeng/dataview';
import { ChartModule } from 'primeng/chart';
import { DialogModule } from 'primeng/dialog';
import { IconFieldModule } from 'primeng/iconfield';
import { InputIconModule } from 'primeng/inputicon';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';


const PRIME_NG_MODULES = [
  ButtonModule,
  ScrollPanelModule,
  TooltipModule,
  AccordionModule,
  CardModule,
  PanelModule,
  SliderModule,
  DataViewModule,
  ChartModule,
  DialogModule,
  IconFieldModule,
  InputIconModule,
  InputTextModule,
  SelectModule
];

@NgModule({
  imports: [...PRIME_NG_MODULES],
  exports: [...PRIME_NG_MODULES]
})
export class PrimeNgImports { }
