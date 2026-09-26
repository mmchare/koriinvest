import type { ComponentType } from "react";
import {
  SlideAsk,
  SlideBusiness,
  SlideMarket,
  SlideProblem,
  SlideProduct,
  SlideRoadmap,
  SlideScenarios,
  SlideSolution,
  SlideTitle,
  SlideToken,
  SlideWhyCrypto,
} from "./slides";

export type SlideDef = {
  id: string;
  title: string;
  Comp: ComponentType;
};

export const SLIDES: SlideDef[] = [
  { id: "01-titre", title: "KORI ($KRI)", Comp: SlideTitle },
  { id: "02-probleme", title: "Le problème", Comp: SlideProblem },
  { id: "03-crypto", title: "Pourquoi la crypto", Comp: SlideWhyCrypto },
  { id: "04-solution", title: "La solution KORI", Comp: SlideSolution },
  { id: "05-produit", title: "Le produit live", Comp: SlideProduct },
  { id: "06-token", title: "Le token $KRI", Comp: SlideToken },
  { id: "07-business", title: "Business model", Comp: SlideBusiness },
  { id: "08-scenarios", title: "Scénarios financiers", Comp: SlideScenarios },
  { id: "09-marche", title: "Marché & différenciation", Comp: SlideMarket },
  { id: "10-roadmap", title: "Roadmap", Comp: SlideRoadmap },
  { id: "11-ask", title: "L'ask", Comp: SlideAsk },
];
