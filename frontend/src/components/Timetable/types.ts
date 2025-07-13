export interface BaseTimeBlock {
  startTime: string;
  endTime: string;
  color: string;
  day: string;
}

export interface ModuleBlock extends BaseTimeBlock {
  type: 'module';
  moduleCode: string;
  lessonType: string;
  classNo: string;
  venue: string;
  originalEntry?: any;
}

export interface CustomBlock extends BaseTimeBlock {
  type: 'custom';
  id: string;
  eventName: string;
}

export type TimetableBlock = ModuleBlock | CustomBlock;

export interface CustomTimeBlock {
  id?: string;
  eventName: string;
  days: string[];
  startTime: string;
  endTime: string;
  color: string;
}

export interface SelectedModule {
  [moduleCode: string]: any;
}

export interface TimePreferenceData {
  [day: string]: {
    [time: string]: boolean;
  };
}