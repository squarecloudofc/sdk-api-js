import EventEmitter from "events";
import type { Application, ApplicationStatus, User } from "..";

export class TypedEventEmitter<TEvents extends Record<string, any>> {
	private emitter = new EventEmitter();

	emit<TEventName extends keyof TEvents & string>(
		eventName: TEventName,
		...eventArg: TEvents[TEventName]
	) {
		this.emitter.emit(eventName, ...(eventArg as []));
	}

	on<TEventName extends keyof TEvents & string>(
		eventName: TEventName,
		handler: (...eventArg: TEvents[TEventName]) => void,
	) {
		this.emitter.on(eventName, handler as any);
	}

	off<TEventName extends keyof TEvents & string>(
		eventName: TEventName,
		handler: (...eventArg: TEvents[TEventName]) => void,
	) {
		this.emitter.off(eventName, handler as any);
	}
}

export interface ClientEvents {
	logsUpdate: [
		application: Application,
		before: string | undefined,
		after: string,
	];
	backupUpdate: [
		application: Application,
		before: string | undefined,
		after: string,
	];
	statusUpdate: [
		application: Application,
		before: ApplicationStatus | undefined,
		after: ApplicationStatus,
	];
	userUpdate: [before: User | undefined, after: User];
}
