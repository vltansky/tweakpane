import {forceCast} from '../misc/type-util';
import {ButtonController} from '../plugin/blade/button/controller';
import {InputBindingController} from '../plugin/blade/common/controller/input-binding';
import {MonitorBindingController} from '../plugin/blade/common/controller/monitor-binding';
import {Blade} from '../plugin/blade/common/model/blade';
import {FolderController} from '../plugin/blade/folder/controller';
import {RootController} from '../plugin/blade/root/controller';
import {SeparatorController} from '../plugin/blade/separator/controller';
import {Target} from '../plugin/common/model/target';
import {InputBindingPlugin} from '../plugin/input-binding';
import {MonitorBindingPlugin} from '../plugin/monitor-binding';
import {ButtonApi} from './button';
import {ComponentApi} from './component-api';
import {handleFolder} from './event-handler-adapters';
import {FolderApi} from './folder';
import {InputBindingApi} from './input-binding';
import {createInputBindingController} from './input-binding-controllers';
import {MonitorBindingApi} from './monitor-binding';
import {createMonitorBindingController} from './monitor-binding-controllers';
import {Plugins} from './plugins';
import {exportPresetJson, importPresetJson, PresetObject} from './preset';
import {SeparatorApi} from './separator';
import {
	ButtonParams,
	FolderParams,
	InputParams,
	MonitorParams,
	SeparatorParams,
} from './types';

interface RootApiEventHandlers {
	change: (value: unknown) => void;
	fold: (expanded: boolean) => void;
	update: (value: unknown) => void;
}

type PluginRegistration<In, Ex> =
	| {
			type: 'input';
			plugin: InputBindingPlugin<In, Ex>;
	  }
	| {
			type: 'monitor';
			plugin: MonitorBindingPlugin<Ex>;
	  };

/**
 * The Tweakpane interface.
 *
 * ```
 * new Tweakpane(options: TweakpaneConfig): RootApi
 * ```
 *
 * See [[`TweakpaneConfig`]] interface for available options.
 */
export class RootApi implements ComponentApi {
	/**
	 * @hidden
	 */
	public readonly controller: RootController;

	// TODO: Publish
	/**
	 * @hidden
	 */
	public static registerPlugin<In, Ex>(r: PluginRegistration<In, Ex>): void {
		if (r.type === 'input') {
			Plugins.inputs.unshift(r.plugin);
		} else if (r.type === 'monitor') {
			Plugins.monitors.unshift(r.plugin);
		}
	}

	/**
	 * @hidden
	 */
	constructor(rootController: RootController) {
		this.controller = rootController;
	}

	get element(): HTMLElement {
		return this.controller.view.element;
	}

	get expanded(): boolean {
		const folder = this.controller.folder;
		return folder ? folder.expanded : true;
	}

	set expanded(expanded: boolean) {
		const folder = this.controller.folder;
		if (folder) {
			folder.expanded = expanded;
		}
	}

	get hidden(): boolean {
		return this.controller.blade.hidden;
	}

	set hidden(hidden: boolean) {
		this.controller.blade.hidden = hidden;
	}

	public dispose(): void {
		this.controller.blade.dispose();
	}

	public addInput<O extends Record<string, any>, Key extends string>(
		object: O,
		key: Key,
		opt_params?: InputParams,
	): InputBindingApi<unknown, O[Key]> {
		const params = opt_params || {};
		const bc = createInputBindingController(
			this.controller.document,
			new Target(object, key, params.presetKey),
			params,
		);
		this.controller.bladeRack.add(bc, params.index);
		return new InputBindingApi(forceCast(bc));
	}

	public addMonitor<O extends Record<string, any>, Key extends string>(
		object: O,
		key: Key,
		opt_params?: MonitorParams,
	): MonitorBindingApi<O[Key]> {
		const params = opt_params || {};
		const bc = createMonitorBindingController(
			this.controller.document,
			new Target(object, key),
			params,
		);
		this.controller.bladeRack.add(bc, params.index);
		return new MonitorBindingApi(forceCast(bc));
	}

	public addButton(params: ButtonParams): ButtonApi {
		const bc = new ButtonController(this.controller.document, {
			...params,
			blade: new Blade(),
		});
		this.controller.bladeRack.add(bc, params.index);
		return new ButtonApi(bc);
	}

	public addFolder(params: FolderParams): FolderApi {
		const bc = new FolderController(this.controller.document, {
			...params,
			blade: new Blade(),
		});
		this.controller.bladeRack.add(bc, params.index);
		return new FolderApi(bc);
	}

	public addSeparator(opt_params?: SeparatorParams): SeparatorApi {
		const params = opt_params || {};
		const bc = new SeparatorController(this.controller.document, {
			blade: new Blade(),
		});
		this.controller.bladeRack.add(bc, params.index);
		return new SeparatorApi(bc);
	}

	/**
	 * Import a preset of all inputs.
	 * @param preset The preset object to import.
	 */
	public importPreset(preset: PresetObject): void {
		const targets = this.controller.bladeRack
			.find(InputBindingController)
			.map((ibc) => {
				return ibc.binding.target;
			});
		importPresetJson(targets, preset);
		this.refresh();
	}

	/**
	 * Export a preset of all inputs.
	 * @return The exported preset object.
	 */
	public exportPreset(): PresetObject {
		const targets = this.controller.bladeRack
			.find(InputBindingController)
			.map((ibc) => {
				return ibc.binding.target;
			});
		return exportPresetJson(targets);
	}

	/**
	 * Adds a global event listener. It handles all events of child inputs/monitors.
	 * @param eventName The event name to listen.
	 * @return The API object itself.
	 */
	public on<EventName extends keyof RootApiEventHandlers>(
		eventName: EventName,
		handler: RootApiEventHandlers[EventName],
	): RootApi {
		handleFolder({
			eventName: eventName,
			folder: this.controller.folder,
			// TODO: Type-safe
			handler: forceCast(handler.bind(this)),
			bladeRack: this.controller.bladeRack,
		});
		return this;
	}

	/**
	 * Refreshes all bindings of the pane.
	 */
	public refresh(): void {
		// Force-read all input bindings
		this.controller.bladeRack.find(InputBindingController).forEach((ibc) => {
			ibc.binding.read();
		});

		// Force-read all monitor bindings
		this.controller.bladeRack.find(MonitorBindingController).forEach((mbc) => {
			mbc.binding.read();
		});
	}
}