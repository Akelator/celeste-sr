import { Routes } from '@angular/router';
import { MainComponent } from './components';


export const routes: Routes = [
	{
		path: '',
		component: MainComponent
	},
	{
		path: '**',
		redirectTo: ''
	}
];
