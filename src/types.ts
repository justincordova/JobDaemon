export interface Job {
  id: string;
  title: string;
  company?: string;
  location?: string;
  date?: string;
  salary?: string;
  source?: 'InternList' | 'GitHub';
  link: string;
  workModel?: string;
}
